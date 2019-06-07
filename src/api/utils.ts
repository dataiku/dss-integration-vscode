export function canEditWebApp(dssVersion: string): boolean {
    return versionGreaterThan(dssVersion, 5, 1, 4);
}

export function canCreateFolderAndSafelySave(dssVersion: string): boolean {
    return versionGreaterThan(dssVersion, 5, 1, 4);
}

function versionGreaterThan(currentDSSVersion: string, majorToCompare: number, minorToCompare: number, revisionToCompare: number) {
    let [ major, minor, revision ] = currentDSSVersion.split(".");
    return Number(major) < majorToCompare || Number(minor) < minorToCompare || Number(revision) < revisionToCompare;
}