// File System Access API pieces that TypeScript's DOM lib doesn't ship yet
// (WICG spec: file pickers and per-handle permission queries).

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

interface OpenFilePickerOptions {
  types?: SaveFilePickerOptions['types'];
}

interface Window {
  showSaveFilePicker?(
    options?: SaveFilePickerOptions
  ): Promise<FileSystemFileHandle>;
  showOpenFilePicker?(
    options?: OpenFilePickerOptions
  ): Promise<FileSystemFileHandle[]>;
}
