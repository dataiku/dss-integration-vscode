export interface VersionTag {
    versionNumber: number;
    lastModifiedBy: {
        login: string;
    };
    lastModifiedOn: number;
}

export function hasSameVersionTag(local: VersionTag | null | undefined, remote: VersionTag | null | undefined): boolean {
    const localTag = local || null;
    const remoteTag = remote || null;
    if (localTag === null || remoteTag === null) {
        return localTag === remoteTag;
    }
    return localTag.versionNumber === remoteTag.versionNumber;
}
