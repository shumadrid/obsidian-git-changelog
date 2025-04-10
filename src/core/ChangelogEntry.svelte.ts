import type { Spacetime } from 'spacetime';
import type {
  DiffFile,
  DiffFileStatus,
  FilesSummary,
  TextDiffStats
} from 'types.ts';

export abstract class ChangelogEntry {
  public constructor(
    public timeZoneAdjustedDate: Spacetime,

    public commitHash: string // Represents a single commit that's just the latest commit of a certain interval (day,week...).
  ) {}

  public abstract isInitialCommit(): boolean;
  /**
   * Always returns undefined for vault changelog entries and the file path for file changelog entries.
   * It exists so that it's easier to write universal functions
   */
  public abstract getPotentialGitFilePath(): string | undefined;
}

export class FileChangelogEntry extends ChangelogEntry implements DiffFile {
  public fromPathGitRelative?: string;
  public pathGitRelative: string;
  public status: DiffFileStatus;
  public textDiffStats?: TextDiffStats;

  public constructor({
    commitHash,
    fromPathGitRelative,
    pathGitRelative,
    status,
    textDiffStats,
    timeZoneAdjustedDate
  }: {
    commitHash: string;
    fromPathGitRelative?: string;
    pathGitRelative: string;
    status: DiffFileStatus;
    textDiffStats?: TextDiffStats;
    timeZoneAdjustedDate: Spacetime;
  }) {
    super(timeZoneAdjustedDate, commitHash);
    this.pathGitRelative = pathGitRelative;
    this.status = status;
    this.fromPathGitRelative = fromPathGitRelative;
    this.textDiffStats = textDiffStats;
  }

  public override isInitialCommit(): boolean {
    return this.fromPathGitRelative === undefined;
  }

  public override getPotentialGitFilePath(): string {
    return this.pathGitRelative;
  }
  // IsCollapsed?: boolean;
}

export class VaultChangelogEntry extends ChangelogEntry {
  public binaryFiles: DiffFile[];
  public binaryFilesSummaryCached: FilesSummary;
  public isCollapsed = $state<boolean>(true);
  public previousVersionCommitHash?: string; // Empty on the first version
  public textFiles: DiffFile[];
  public textFilesSummaryCached: FilesSummary;

  public get files(): DiffFile[] {
    return [...this.textFiles, ...this.binaryFiles];
  }

  public constructor({
    binaryFiles,
    binaryFilesSummaryCached,
    commitHash,
    previousVersionLastCommitHash,
    textFiles,
    textFilesSummaryCached,
    timeZoneAdjustedDate
  }: {
    binaryFiles: DiffFile[];
    binaryFilesSummaryCached: FilesSummary;
    commitHash: string;
    previousVersionLastCommitHash?: string;
    textFiles: DiffFile[];
    textFilesSummaryCached: FilesSummary;
    timeZoneAdjustedDate: Spacetime;
  }) {
    super(timeZoneAdjustedDate, commitHash);
    this.textFiles = textFiles;
    this.binaryFiles = binaryFiles;
    this.textFilesSummaryCached = textFilesSummaryCached;
    this.binaryFilesSummaryCached = binaryFilesSummaryCached;
    this.previousVersionCommitHash = previousVersionLastCommitHash;
  }

  public override getPotentialGitFilePath(): undefined {
    return undefined;
  }

  public getChangelogContentAdditions(): number {
    let additions = 0;
    for (const file of this.files) {
      if (file.textDiffStats) {
        additions += file.textDiffStats.baseStats.additions;
      }
    }
    return additions;
  }

  public getChangelogContentDeletions(): number {
    let deletions = 0;
    for (const file of this.files) {
      if (file.textDiffStats) {
        deletions += file.textDiffStats.baseStats.deletions;
      }
    }
    return deletions;
  }

  public getChangelogContentMoves(): number {
    let moves = 0;
    for (const file of this.files) {
      if (file.textDiffStats?.moveStats) {
        moves +=
          file.textDiffStats.moveStats.internalMoves +
          file.textDiffStats.moveStats.outgoingMoves;
      }
    }
    return moves;
  }

  public getChangelogFilesSummary(): FilesSummary {
    return {
      addedFiles:
        this.textFilesSummaryCached.addedFiles +
        this.binaryFilesSummaryCached.addedFiles,
      deletedFiles:
        this.textFilesSummaryCached.deletedFiles +
        this.binaryFilesSummaryCached.deletedFiles,
      modifiedFiles:
        this.textFilesSummaryCached.modifiedFiles +
        this.binaryFilesSummaryCached.modifiedFiles,
      renamedAndMovedFiles:
        this.textFilesSummaryCached.renamedAndMovedFiles +
        this.binaryFilesSummaryCached.renamedAndMovedFiles
    };
  }

  public override isInitialCommit(): boolean {
    return this.previousVersionCommitHash === undefined;
  }
}
