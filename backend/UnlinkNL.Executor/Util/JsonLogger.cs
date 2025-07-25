using Newtonsoft.Json;

namespace UnlinkNL.Executor.Util;

public class JsonLogger : ILogger
{
    public void LogTrace(string message, params object[] args)
        => Log("Trace", message, args);

    public void LogInformation(string message, params object[] args)
        => Log("Information", message, args);

    public void LogWarning(string message, params object[] args)
        => Log("Warning", message, args);

    public void LogError(string message, params object[] args)
        => Log("Error", message, args);

    private void Log(string level, string message, object[] args)
    {
        if (level == "Trace") return;
        
        var json = JsonConvert.SerializeObject(new
        {
            level,
            message = args.Length > 0 ? string.Format(message, args) : message,
            timestamp = DateTime.UtcNow.ToString("O")
        });

        Console.WriteLine(json);
    }
}