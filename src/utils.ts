export function roundedFormat(time: number) {
    const timeInDays = Math.floor(time / (1000 * 3600 * 24));
    if (timeInDays < 1) {
        const timeInHours = Math.floor(time / (1000 * 3600));
        if (timeInHours < 1) {
            const timeInMinutes = Math.floor(time / (1000 * 60));
            if (timeInMinutes < 1) {
                const timeInSeconds = Math.floor(time / (1000));
                return timeInSeconds + " "+ pluralize("second", timeInSeconds);

            } else {
                return timeInMinutes + " " + pluralize("minute", timeInMinutes);
            } 
        } else {
            return timeInHours + " " + pluralize(" hour", timeInHours);
        }
    } else {
        return timeInDays + pluralize("day", timeInDays);
    }
}

function pluralize(word: string, count: number): string {
    return count > 1 ? word+"s" : word;
}

export const dssLanguageIdToFileType: any = {
    "python": "py",
    "r": "r",
    "shell": "sh",
    "sql_query": "sql",
    "sparkr": "r",
    "pyspark": "py",
    "spark_sql_query": "sql",
    "spark_scala": "scala",
    "hive": "hive"
};