using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

// ReSharper disable InconsistentNaming

namespace UnlinkNL.Executor.Util;

public static class ProcessUtils
{
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(ProcessAccessFlags dwDesiredAccess, bool bInheritHandle, uint dwProcessId);

    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("ntdll.dll")]
    public static extern int NtQueryInformationProcess(IntPtr hProcess, PROCESSINFOCLASS processInformationClass, ref PROCESS_BASIC_INFORMATION processInformation, uint processInformationLength, ref uint returnLength);

    [DllImport("kernel32.dll", EntryPoint = "CreateFileW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFile(string lpFileName, int dwDesiredAccess, int dwShareMode, IntPtr securityAttributes, int dwCreationDisposition, int dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", EntryPoint = "GetFinalPathNameByHandleW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetFinalPathNameByHandle([In] SafeFileHandle hFile, [Out] StringBuilder lpszFilePath, [In] int cchFilePath, [In] int dwFlags);
    
    private const int CREATION_DISPOSITION_OPEN_EXISTING = 3;
    private const int FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
    
    [Flags]
    public enum ProcessAccessFlags : uint
    {
        PROCESS_QUERY_INFORMATION = 0x0400,
        PROCESS_VM_READ = 0x0010,
    }

    public enum PROCESSINFOCLASS
    {
        ProcessBasicInformation = 0
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_BASIC_INFORMATION
    {
        public IntPtr Reserved;
        public IntPtr PebBaseAddress;
        public uint AffinityMask;
        public uint BasePriority;
        public IntPtr UniqueProcessId;
        public IntPtr InheritedFromUniqueProcessId;
    }
    
    public static string GetRealPath(string path)
    {
        if (!Directory.Exists(path) && !File.Exists(path))
        {
            throw new IOException("Path not found");
        }

        var directoryHandle = CreateFile(path, 0, 2, IntPtr.Zero, CREATION_DISPOSITION_OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, IntPtr.Zero); //Handle file / folder

        if (directoryHandle.IsInvalid)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        var result = new StringBuilder(512);
        var mResult = GetFinalPathNameByHandle(directoryHandle, result, result.Capacity, 0);

        if (mResult < 0)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        return result is ['\\', '\\', '?', '\\', ..] 
            ? result.ToString()[4..] 
            : result.ToString();
    }

    public static Process? GetParentProcess(int pid)
    {
        var iParentPid = 0;
        var oHnd = IntPtr.Zero;

        try
        {
            oHnd = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);

            if (oHnd == IntPtr.Zero)
                return null;

            var oProcInfo = new PROCESSENTRY32
            {
                dwSize = (uint)Marshal.SizeOf<PROCESSENTRY32>()
            };

            if (Process32First(oHnd, ref oProcInfo) == false)
                return null;

            do
            {
                if (pid == oProcInfo.th32ProcessID)
                    iParentPid = (int)oProcInfo.th32ParentProcessID;
            } while (iParentPid == 0 && Process32Next(oHnd, ref oProcInfo));

            return iParentPid > 0 ? Process.GetProcessById(iParentPid) : null;
        }
        finally
        {
            if (oHnd != IntPtr.Zero) 
                CloseHandle(oHnd);
        }
    }

    private const uint TH32CS_SNAPPROCESS = 2;

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESSENTRY32
    {
        public uint dwSize;
        public uint cntUsage;
        public uint th32ProcessID;
        public IntPtr th32DefaultHeapID;
        public uint th32ModuleID;
        public uint cntThreads;
        public uint th32ParentProcessID;
        public int pcPriClassBase;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string szExeFile;
    };
 
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr CreateToolhelp32Snapshot(uint dwFlags, uint th32ProcessID);
 
    [DllImport("kernel32.dll")]
    static extern bool Process32First(IntPtr hSnapshot, ref PROCESSENTRY32 lppe);
 
    [DllImport("kernel32.dll")]
    static extern bool Process32Next(IntPtr hSnapshot, ref PROCESSENTRY32 lppe);
}