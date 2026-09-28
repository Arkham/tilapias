import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tlc2.TLC;
import util.ToolIO;

public final class FieldnotesRunner {
    public static String run(String spec, String config) throws Exception {
        Matcher module = Pattern.compile("(?m)^-{4,}\\s*MODULE\\s+([A-Za-z][A-Za-z0-9_]*)\\s*-{4,}").matcher(spec);
        if (!module.find()) throw new IllegalArgumentException("Expected a ---- MODULE Name ---- header.");
        String name = module.group(1);
        Files.createDirectories(Paths.get("/files/work"));
        Files.write(Paths.get("/files/work/" + name + ".tla"), spec.getBytes(StandardCharsets.UTF_8));
        Files.write(Paths.get("/files/work/" + name + ".cfg"), config.getBytes(StandardCharsets.UTF_8));
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        PrintStream capture = new PrintStream(bytes, true, "UTF-8");
        ToolIO.setUserDir("/files/work");
        ToolIO.out = capture;
        ToolIO.err = capture;
        System.setOut(capture);
        System.setErr(capture);
        TLC checker = new TLC();
        if (!checker.handleParameters(new String[] {
            "-workers", "1", "-fpmem", "0.01", "-cleanup", "-metadir", "/files/work/states",
            "-config", "/files/work/" + name + ".cfg", "/files/work/" + name + ".tla"
        })) throw new IllegalArgumentException("TLC rejected its command-line arguments.");
        int result = checker.process();
        capture.println("\nFieldnotes TLC result: " + result);
        return bytes.toString("UTF-8");
    }
}
