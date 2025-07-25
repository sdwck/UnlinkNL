using System.Diagnostics;
using System.Text;
using UnlinkNL.Executor.Util;

namespace UnlinkNL.Executor.Services
{
    public class HardwareIdentityService
    {
        private readonly ILogger _logger;

        public HardwareIdentityService(ILogger logger)
        {
            _logger = logger;
        }

        public void ChangeHwid(string toolPath)
        {
            if (!File.Exists(toolPath))
            {
                _logger.LogError($"Could not locate extracted tool at {toolPath}");
                return;
            }

            foreach (var drive in Environment.GetLogicalDrives())
            {
                var id = GenerateRandomHwid();
                var startInfo = new ProcessStartInfo(toolPath)
                {
                    Arguments         = $"{drive.ToLower()[..1]}: {id}",
                    UseShellExecute   = false,
                    CreateNoWindow    = true,
                    RedirectStandardOutput = true
                };

                using var process = Process.Start(startInfo);
                if (process == null)
                {
                    _logger.LogWarning($"Failed to start Volumeid64.exe for drive {drive}");
                    continue;
                }

                var output = process.StandardOutput.ReadToEnd();
                process.WaitForExit();
                _logger.LogTrace($"Volumeid64 output for {drive}: {output}");
                _logger.LogInformation($"Randomized HWID for {drive} to {id}");
            }
        }

        private static string GenerateRandomHwid()
        {
            const string chars = "ABCDEF0123456789";
            const int len = 8;
            var sb = new StringBuilder(len + 1);
            var rnd = new Random();

            for (var i = 1; i <= len; i++)
            {
                sb.Append(chars[rnd.Next(chars.Length)]);
                if (i == len / 2)
                    sb.Append('-');
            }

            return sb.ToString();
        }
    }
}
