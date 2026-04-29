import { Box, Button, Checkbox, Container, Divider, Flex, Grid, HStack, Icon, IconButton, Modal, Spinner, Stack, StackDivider, Text, Tooltip, VStack, getToken } from "@chakra-ui/react";
import { Calendar, Views, dateFnsLocalizer, momentLocalizer} from "react-big-calendar";
import moment from 'moment'
import { enUS } from 'date-fns/locale/en-US';
import {format} from 'date-fns/format';
import { getDay } from 'date-fns/getDay';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';



const months = [
    "January", "February", "March",
    "April", "May", "June",
    "July", "August", "September",
    "October", "November", "December"
  ]
  
  const locales = {
    'en-US': enUS,
  }
  
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
  });
  
const userEventColor = "#006dff";
const scheduledEventColor = "#ff0000";
const googleCalendarEventColor = "#0bad12";

const [currentView, setCurrentView] = useState(1)
const [currentDate, setCurrentDate] = useState(new Date())
const [currentDateText, setCurrentDateText] = useState(`
${months[currentDate.getMonth()]} 
${currentDate.getDate()}, 
${currentDate.getFullYear()}`)

useEffect(() => {
    setCurrentDateText(`
    ${months[currentDate.getMonth()]} 
    ${currentDate.getDate()}, 
    ${currentDate.getFullYear()}`)
  }, [currentDate])

let calendarView = [Views.DAY, Views.WEEK, Views.MONTH]
const handleDayClick = (e: React.MouseEvent<HTMLButtonElement>) => {
setCurrentView(0);
};
const handleWeekClick = (e: React.MouseEvent<HTMLButtonElement>) => {
e.stopPropagation();
setCurrentView(1);
};
const handleMonthClick = (e: React.MouseEvent<HTMLButtonElement>) => {
e.stopPropagation();
setCurrentView(2);
};

const handleTodayClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setCurrentDate(new Date())
}
const handlePrevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (calendarView[currentView] == Views.DAY) {setCurrentDate(sub(currentDate, {days: 1}))}
    if (calendarView[currentView] == Views.WEEK) {setCurrentDate(sub(currentDate, {weeks: 1}))}
    if (calendarView[currentView] == Views.MONTH) {setCurrentDate(sub(currentDate, {months: 1}))}
};
    const handleNextClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (calendarView[currentView] == Views.DAY) {setCurrentDate(add(currentDate, {days: 1}))}
    if (calendarView[currentView] == Views.WEEK) {setCurrentDate(add(currentDate, {weeks: 1}))}
    if (calendarView[currentView] == Views.MONTH) {setCurrentDate(add(currentDate, {months: 1}))}
}

/*const handleGoogleSubscribe = () => {
    connectGoogleAccount(userId);
};*/ 

const MyCalendar = (props) => (
  <div>
    <Calendar
      localizer={localizer}
      events={myEventsList}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 500 }}
    />
  </div>
)