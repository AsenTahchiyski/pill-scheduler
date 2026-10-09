// File System Access API pieces that TypeScript's DOM lib doesn't ship yet
// (WICG spec: showSaveFilePicker and per-handle permission queries).

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemFileHandle {
  queryPermission?(
    descriptor?: FileSystemHandlePermissionDescriptor
  ): Promise<PermissionState>;
  requestPermission?(
    descriptor?: FileSystemHandlePermissionDescriptor
  ): Promise<PermissionState>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: {
    description?: string;
    accept: Record<string, string[]>;
  }[];
}

interface Window {
  showSaveFilePicker?(
    options?: SaveFilePickerOptions
  ): Promise<FileSystemFileHandle>;
}
