export enum DiffNameStatus {
  ADDED = 'A',
  COPIED = 'C',
  DELETED = 'D',
  MODIFIED = 'M',
  RENAMED = 'R',
  CHANGED = 'T',
  UNMERGED = 'U',
  UNKNOWN = 'X',
  BROKEN = 'B'
}

export interface DiffResultNameStatusFile extends DiffResultTextFile {
  status?: DiffNameStatus;
  from?: string;
  similarity: number;
}

export interface DiffResultTextFile {
  file: string;
  changes: number;
  insertions: number;
  deletions: number;
  binary: false;
}
