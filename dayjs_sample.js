import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear.js';
dayjs.extend(weekOfYear);

const str = '2023-02-01'
const week = dayjs(str).week()


console.log(week);