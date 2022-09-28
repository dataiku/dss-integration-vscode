export function canEditWebApp(dssVersion: string): boolean {
    return versionGreaterThan(dssVersion, 5, 1, 4);
}

export function canCreateFolderAndSafelySave(dssVersion: string): boolean {
    return versionGreaterThan(dssVersion, 5, 1, 4);
}

export function canRenameAndMoveLibraryContents(dssVersion: string): boolean {
    return versionGreaterThan(dssVersion, 11, 1, 0);
}

export function canRenameAndMovePluginContents(dssVersion: string): boolean {
    return versionGreaterThan(dssVersion, 11, 1, 0);
}

function versionGreaterThan(currentDSSVersion: string, majorToCompare: number, minorToCompare: number, revisionToCompare: number) {
    let [ major, minor, revision ] = currentDSSVersion.split(".");
    if (Number(major) < majorToCompare) {	   
        return false;	
    } else if (Number(major) > majorToCompare) {	
        return true;	
    } else {	
        if (Number(minor) < minorToCompare) {	
            return false;	
        } else if (Number(minor) > minorToCompare) {	
            return true;	
        } else {
            if (Number(revision) < revisionToCompare) {	
                return false;	
            } else {	
                return true;	
            }	
        }
     }
}