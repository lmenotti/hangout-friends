'use client'
import { ChakraProvider, defaultSystem, Box, Button, Checkbox, Container, Separator, Flex, Grid, HStack, Icon, IconButton, Spinner, Stack, Text, Tooltip, VStack } from "@chakra-ui/react";
import { Calendar, Views, dateFnsLocalizer, momentLocalizer} from "react-big-calendar";
import moment from 'moment'
import { useEffect, useRef, useState } from "react";
import { enUS } from 'date-fns/locale/en-US';
import {format} from 'date-fns/format';
import { getDay } from 'date-fns/getDay';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { add, sub } from 'date-fns'; 

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
  
const googleCalendarEventColor = "#0bad12";

export default function CalendarPage() {
    const [currentView, setCurrentView] = useState(1);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentDateText, setCurrentDateText] = useState('')

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

    return (
        <Flex height="100vh" width="100%" position="relative">
            <VStack
                align="flex-start"
                position={"relative"}
                overflow="hidden"
                width="100%"
                >
                <HStack
                    position="relative"
                    width="100%"
                    height="100%"
                    alignItems={"flex-start"}
                    >
                    {/*Middle container*/}
                    <Flex
                    bg="#191970"
                    width="100%"
                    height="100%"
                    padding="10px"
                    position="relative"
                    >
                        <VStack width="100%" height="100%" alignItems="flex-start">
                            <HStack width="100%" justifyContent={"space-between"}>
                                <VStack align="flex-start">
                                    <Text
                                        fontFamily={"monospace"}
                                        fontSize={"25px"}
                                        fontWeight={"bolder"}
                                        filter="drop-show(1px 1px 3px black);"
                                        color="white"
                                        width="100%"
                                    >
                                        {currentDateText}
                                    </Text>
                                    <Button bg="black" onClick={handleTodayClick}>Today</Button>
                                </VStack>
                                <HStack position="relative" borderRadius={"4px"}>
                                <Button bg="black" onClick={handlePrevClick}>Previous</Button>
                                <HStack bg="white" height="100%" borderRadius={"10px"}>
                                <Button
                                    bg={calendarView[currentView] == Views.DAY ? "#191970" : "white"}
                                    color={calendarView[currentView] == Views.DAY ? "white" : "black"}
                                    onClick={handleDayClick}
                                >
                                    Day
                                </Button>
                                <Separator orientation="vertical" borderColor="gray.600" height="25px" />
                                <Button
                                    bg={calendarView[currentView] == Views.WEEK ? "#191970" : "white"}
                                    color={calendarView[currentView] == Views.WEEK ? "white" : "black"}
                                    onClick={handleWeekClick}
                                >
                                    Week
                                </Button>
                                <Separator orientation="vertical" borderColor="gray.600" height="25px" />
                                <Button
                                    bg={calendarView[currentView] == Views.MONTH ? "#191970" : "white"}
                                    color={calendarView[currentView] == Views.MONTH ? "white" : "black"}
                                    onClick={handleMonthClick}
                                >
                                    Month
                                </Button>
                            </HStack>
                                <Button bg="black" onClick={handleNextClick}>Next</Button>
                            </HStack>
                            <HStack position="relative" borderRadius={"10px"}>
                            </HStack>
                            </HStack>
                            <Calendar
                                localizer={localizer}
                                startAccessor="start"
                                endAccessor="end"
                                defaultView={Views.WEEK}
                                date={currentDate}
                                view={calendarView[currentView]}
                                toolbar={false}
                            />
                        </VStack>
                    </Flex>
                </HStack>
            </VStack>
        </Flex>
)};