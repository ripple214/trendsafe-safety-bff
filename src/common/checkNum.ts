export const checkNum = (num: number): number => {
    if(num == undefined || isNaN(num)) {
        return 0;
    } else {
        return num;
    }
}
