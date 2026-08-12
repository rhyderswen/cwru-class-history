import { OfferingInfo } from "#/xlsx";
import { Badge, Box, Paper, Text } from "@mantine/core";
import { DayOrder } from "~/vars";
import "./Class.css";

export interface SemesterProps {
  component: string;
  offerings: Record<string, Omit<OfferingInfo, "component">[]>;
  selectedSemester: string;
}

function getDayColor(day: string) {
  if (day.length !== 1) return "gray";

  switch (day) {
    case "M":
      return "grape";
    case "T":
      return "cyan";
    case "W":
      return "pink";
    case "R":
      return "indigo";
    case "F":
      return "red";
    case "S":
      return "yellow";
    case "U":
      return "yellow";
    default:
      return "gray";
  }
}

function getDayColoredBadges(days: string, time: string) {
  if (days.length === 0)
    return (
      <Badge color="gray" ml={4}>
        No time declared
      </Badge>
    );
  if (days.length === 1) {
    return <Badge color={getDayColor(days.charAt(0))} ml={4}>{`${days} ${time}`}</Badge>;
  }

  return (
    <Badge
      variant="gradient"
      gradient={{
        from: getDayColor(days.charAt(0)),
        to: getDayColor(days.charAt(days.length - 1)),
        deg: 90,
      }}
      ml={4}
    >{`${days} ${time}`}</Badge>
  );
}

function Semester({ component, offerings, selectedSemester }: SemesterProps) {
  return (
    <Paper shadow="none" p="md" bg="var(--mantine-color-gray-0)" withBorder>
      <Text ta="center" mb="xs">
        {component}
      </Text>
      <Box>
        {Object.entries(offerings)
          .filter(([key]) => key.startsWith(selectedSemester))
          .map(([key, value]) => (
            <Box key={key} mb={6}>
              {key}:
              {value
                .sort(
                  (a, b) => DayOrder.indexOf(a.days.charAt(0)) - DayOrder.indexOf(b.days.charAt(0)),
                )
                .map((offering) => (
                  <span key={offering.courseNumber}>
                    {getDayColoredBadges(offering.days, offering.time)}{" "}
                  </span>
                ))}
            </Box>
          ))}
      </Box>
    </Paper>
  );
}

export default Semester;
