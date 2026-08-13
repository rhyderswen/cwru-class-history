import { OfferingInfo } from "#/xlsx";
import { Box, MantineStyleProp, Paper, Text } from "@mantine/core";
import { DayOrder } from "~/vars";
import "./Class.css";

export interface SemesterProps {
  component: string;
  offerings: Record<string, Omit<OfferingInfo, "component">[]>;
  selectedSemester: string;
}

function getDayColor(day: string, shade: number = 7): string {
  if (day.length !== 1) return "gray";

  switch (day) {
    case "M":
      return `var(--mantine-color-grape-${shade})`;
    case "T":
      return `var(--mantine-color-teal-${shade})`;
    case "W":
      return `var(--mantine-color-pink-${shade})`;
    case "R":
      return `var(--mantine-color-indigo-${shade})`;
    case "F":
      return `var(--mantine-color-orange-${shade})`;
    case "S":
      return `var(--mantine-color-red-${shade})`;
    case "U":
      return `var(--mantine-color-red-${shade})`;
    case "A": // Async
    default:
      return `var(--mantine-color-gray-${shade})`;
  }
}

// function getDayColoredBadges(days: string, time: string) {
//   if (days.length === 0)
//     return (
//       <Badge color="gray" ml={4}>
//         No time specified
//       </Badge>
//     );
//   if (days.length === 1) {
//     return <Badge color={getDayColor(days.charAt(0))} ml={4}>{`${days} ${time}`}</Badge>;
//   }

//   return (
//     <Badge
//       variant="gradient"
//       gradient={{
//         from: getDayColor(days.charAt(0)),
//         to: getDayColor(days.charAt(days.length - 1)),
//         deg: 90,
//       }}
//       ml={4}
//     >{`${days} ${time}`}</Badge>
//   );
// }

function makeColoredPaper(
  offering: Omit<OfferingInfo, "component">,
  color?: string,
  bg?: string,
  styleOverrides?: MantineStyleProp,
  textOverride?: string,
) {
  return (
    <Paper
      shadow="none"
      p={6}
      w="fit-content"
      bd={color && `3px solid ${color}`}
      bg={bg}
      ml={4}
      mb={4}
      display="inline-block"
      style={styleOverrides}
    >
      <Text w="fit-content" lh={1}>
        {textOverride ? textOverride : `${offering.days} ${offering.time}`}
      </Text>{" "}
      <Text size="sm" lh={1} style={{ color: "gray" }}>
        {offering.instructor && `${offering.instructor} | `}
        {getColoredNumber(offering.enrollmentCap - offering.enrollmentTotal)}/
        {offering.enrollmentCap} open
      </Text>
    </Paper>
  );
}

function getColoredNumber(num: number) {
  if (num <= 1) {
    return (
      <Text span c="red" inherit fw={700}>
        {num}
      </Text>
    );
  }

  if (num <= 5) {
    return (
      <Text span c="yellow" inherit fw={700}>
        {num}
      </Text>
    );
  }

  return (
    <Text span inherit>
      {num}
    </Text>
  );
}

function getDayColoredPaper(offering: Omit<OfferingInfo, "component">) {
  if (offering.days.length === 0) {
    return makeColoredPaper(
      offering,
      "var(--mantine-color-gray-5)",
      undefined,
      undefined,
      "No time data",
    );
  }

  if (offering.days.length === 1) {
    return makeColoredPaper(
      offering,
      getDayColor(offering.days.charAt(0)),
      getDayColor(offering.days.charAt(0), 0),
    );
  }

  return makeColoredPaper(offering, undefined, undefined, {
    border: "3px solid transparent",
    backgroundImage: `linear-gradient(45deg, ${getDayColor(offering.days.charAt(0), 0)}, ${getDayColor(offering.days.charAt(offering.days.length - 1), 0)}), linear-gradient(45deg, ${getDayColor(offering.days.charAt(0))}, ${getDayColor(offering.days.charAt(offering.days.length - 1))})`,
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box",
  });
}

function ComponentListing({ component, offerings, selectedSemester }: SemesterProps) {
  return (
    <Paper shadow="none" p="md" bg="var(--mantine-color-gray-0)" withBorder>
      <Text ta="center" mb="xs" fw={700} size="lg">
        {component}
      </Text>
      <Box>
        {Object.entries(offerings)
          .filter(([semester]) => semester.startsWith(selectedSemester))
          .map(([semester, offerings]) => (
            <Box key={semester} mb={12}>
              <Text fw={700} mb={4}>
                {semester}:
              </Text>
              {offerings
                .sort(
                  (a, b) => DayOrder.indexOf(a.days.charAt(0)) - DayOrder.indexOf(b.days.charAt(0)),
                )
                .map((offering) => (
                  <span key={offering.courseNumber}>
                    {getDayColoredPaper(offering)}
                    {/* {getDayColoredBadges(offering.days, offering.time)}{" "} */}
                  </span>
                ))}
            </Box>
          ))}
      </Box>
    </Paper>
  );
}

export default ComponentListing;
