import { Box, Button, Checkbox, Container, Divider, Flex, Grid, HStack, Icon, IconButton, Modal, Spinner, Stack, StackDivider, Text, Tooltip, VStack, getToken } from "@chakra-ui/react";
import { Calendar, Views, dateFnsLocalizer, momentLocalizer} from "react-big-calendar";
import moment from 'moment'

const localizer = momentLocalizer(moment)

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