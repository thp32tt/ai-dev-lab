// @category UW2
// Native Ghidra 12.x headless post-script. Read-only candidate metadata.\n// For DOS COM the pinned PSP-relative file starts at linear 0x10100;\n// EXE uses MZ image linear 0x10000. Both are candidates until DOS replay.
// No original instructions, game bytes, pseudocode or private file paths are exported.
// Arguments: <metadata-out.json> <module-name> <expected-sha256> <image-length>
//            <image-start> <image-end> [load-base-hex]
import com.google.gson.stream.JsonWriter;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;
import ghidra.program.model.address.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public class Uw2GhidraInstructionChunk extends GhidraScript {
    private static long unsigned(String x) {
        if (!x.matches("[0-9]+")) throw new IllegalArgumentException("decimal unsigned integer required");
        return Long.parseLong(x);
    }
    private static String flow(Instruction ins) throws Exception {
        String mnemonic = ins.getMnemonicString().toUpperCase(Locale.ROOT);
        if (mnemonic.equals("RET") || mnemonic.equals("RETF") ||
            mnemonic.equals("IRET") || mnemonic.equals("RETN")) return "RETURN";
        if (mnemonic.equals("INT") || mnemonic.equals("INT3") ||
            mnemonic.equals("INTO")) return "INTERRUPT";
        // Operand 0 carries a far address even when getFlows() maps an alias.
        int op = -1, extension = -1;
        byte[] raw = ins.getBytes();
        int p = 0;
        while (p < raw.length) {
            int prefix = raw[p] & 255;
            if (prefix == 0x26 || prefix == 0x2e || prefix == 0x36 ||
                prefix == 0x3e || prefix == 0xf2 || prefix == 0xf3 || prefix == 0xf0) {
                p++; continue;
            }
            op = prefix;
            if (op == 0xff && p + 1 < raw.length) extension = (raw[p+1] >> 3) & 7;
            break;
        }
        if (op == 0x9a || (op == 0xff && extension == 3)) return "CALL_FAR";
        if (op == 0xea || (op == 0xff && extension == 5)) return "JUMP_FAR";
        if (ins.getFlowType().isCall()) {
            if (op == 0xff || ins.getFlows().length != 1) return "INDIRECT_CALL";
            return "CALL_NEAR";
        }
        if (ins.getFlowType().isJump()) {
            if (op == 0xff || ins.getFlows().length != 1) return "INDIRECT_JUMP";
            return ins.getFlowType().isConditional() ? "JCC_NEAR" : "JUMP_NEAR";
        }
        if (ins.getFlowType().isTerminal()) return "UNKNOWN";
        return "FALLTHROUGH";
    }
    private static boolean targetRequired(String flow) {
        return flow.equals("CALL_NEAR") || flow.equals("JUMP_NEAR") ||
               flow.equals("JCC_NEAR");
    }
    @Override public void run() throws Exception {
        String[] a = getScriptArgs();
        if (a.length != 6 && a.length != 7)
            throw new IllegalArgumentException("expected 6 or 7 bounded arguments");
        Path destination = Paths.get(a[0]).toAbsolutePath().normalize();
        String module = a[1].toUpperCase(Locale.ROOT), sha = a[2];
        if (!module.matches("[A-Z0-9_-]{1,8}\\.(EXE|COM)") || !sha.matches("[a-f0-9]{64}"))
            throw new IllegalArgumentException("pinned Korean original MZ identity required");
        long imageSize = unsigned(a[3]), start = unsigned(a[4]), end = unsigned(a[5]);
        long loadBase = a.length == 7 ? Long.parseLong(a[6], 16) : 0x10000L;
        if (imageSize < 1 || imageSize > 0x1000000L || start >= end ||
            end > imageSize || end-start > 0x10000L || (module.endsWith(".COM") ? loadBase != 0x10100L : loadBase != 0x10000L))
            throw new IllegalArgumentException("invalid bounded original image window");
        if (!currentProgram.getLanguageID().getIdAsString().equals("x86:LE:16:Real Mode"))
            throw new IllegalArgumentException("unexpected Ghidra 8086 processor");
        String programName = currentProgram.getName().toUpperCase(Locale.ROOT);
        if (!programName.equals(module))
            throw new IllegalArgumentException("Ghidra loaded unexpected original module");
        if (!Files.isDirectory(destination.getParent()))
            throw new IOException("pre-existing private metadata output directory required");

        // A raw DOS .COM has no MZ entry header. Only its pinned PSP+0100h
        // entry is established by the COM load contract. The generic binary
        // loader otherwise has no entry point and yields 0 decoded instructions.
        if (module.endsWith(".COM")) {
            Address entry = currentProgram.getAddressFactory()
                .getDefaultAddressSpace().getAddress(loadBase);
            if (!currentProgram.getMemory().contains(entry))
                throw new IOException("original DOS COM load base missing from Ghidra memory");
            if (currentProgram.getListing().getInstructionAt(entry) == null) {
                if (!disassemble(entry))
                    throw new IOException("Ghidra did not decode pinned COM entry");
                createFunction(entry, null);
            }
        }

        // Temporary output is atomic: failed/cancelled analysis never becomes a valid chunk.
        Path temporary = Files.createTempFile(destination.getParent(), ".uw2-ghidra-", ".part");
        boolean completed = false;
        try {
            int decoded = 0, functionEntries = 0;
            JsonWriter out = new JsonWriter(new BufferedWriter(new FileWriter(temporary.toFile())));
            try {
                out.beginObject();
                out.name("schemaVersion").value(1);
                out.name("provider").value("GHIDRA");
                out.name("providerVersion").value("12.1.4");
                out.name("moduleName").value(module);
                out.name("sha256").value(sha);
                out.name("loadBase").value(loadBase);
                out.name("imageBytes").value(imageSize);
                out.name("windowStart").value(start);
                out.name("windowEnd").value(end);
                out.name("instructions").beginArray();
                InstructionIterator it = currentProgram.getListing().getInstructions(true);
                while (it.hasNext()) {
                    if (monitor.isCancelled()) throw new IOException("Ghidra analysis cancelled");
                    Instruction ins = it.next();
                    Address address = ins.getAddress();
                    if (!address.isMemoryAddress() || !address.getAddressSpace().equals(currentProgram.getAddressFactory().getDefaultAddressSpace())) continue;
                    long relative = address.getOffset() - loadBase;
                    int length = ins.getLength();
                    if (relative < start || relative >= end) continue;
                    // A crossing instruction remains UNOBSERVED until a whole-boundary re-scan.
                    if (length < 1 || length > 15 || relative + length > end ||
                        relative + length > imageSize) continue;
                    String type = flow(ins);
                    out.beginObject();
                    out.name("reaAddress").value(address.getOffset());
                    out.name("length").value(length);
                    out.name("flow").value(type);
                    if (targetRequired(type)) {
                        Address[] targets = ins.getFlows();
                        if (targets.length != 1 ||
                            !targets[0].getAddressSpace().equals(currentProgram.getAddressFactory().getDefaultAddressSpace()))
                            throw new IOException("direct Ghidra flow without unique linear target");
                        out.name("targetRea").value(targets[0].getOffset());
                    }
                    out.endObject();
                    decoded++;
                }
                out.endArray();
                // Entry counts are discovery candidates, NOT verified functions.
                out.name("functionEntries").beginArray();
                FunctionIterator functions = currentProgram.getListing().getFunctions(true);
                while (functions.hasNext()) {
                    if (monitor.isCancelled()) throw new IOException("Ghidra analysis cancelled");
                    Function f = functions.next();
                    Address addr = f.getEntryPoint();
                    if (!addr.isMemoryAddress() || !addr.getAddressSpace().equals(currentProgram.getAddressFactory().getDefaultAddressSpace())) continue;
                    long relative = addr.getOffset() - loadBase;
                    if (relative >= start && relative < end) {
                        out.value(addr.getOffset());
                        functionEntries++;
                    }
                }
                out.endArray();
                out.name("instructionCandidateCount").value(decoded);
                out.name("functionEntryCandidateCount").value(functionEntries);
                out.name("verifiedCodeBytes").value(0);
                out.name("fidelity").value("GHIDRA_STATIC_CANDIDATES_ONLY__ORIGINAL_DOS_UNTESTED");
                out.endObject();
                out.flush();
            } finally {
                out.close();
            }
            Files.move(temporary, destination, StandardCopyOption.REPLACE_EXISTING);
            completed = true;
            println("UW2_GHIDRA_CHUNK_OK " + module + " ["+start+","+end+") " + decoded);
        } finally {
            if (!completed) Files.deleteIfExists(temporary);
        }
    }
}
