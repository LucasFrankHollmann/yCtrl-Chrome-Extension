export default function formatTime(time: number){
    const hours = parseInt(String(time/3600));
    const minutes = parseInt(String(time/60 - hours*60));
    const seconds = parseInt(String(time - hours*3600 - minutes*60));

    const returnSeconds = seconds < 10 ? '0' + seconds : '' + seconds;
    const returnMinutes = (minutes < 10 ? '0' + minutes : '' + minutes) + ':';
    const returnHours = hours > 0 ? hours + ':': '';

    return returnHours + returnMinutes + returnSeconds;
}
