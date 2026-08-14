import { OfferingInfo } from "#/xlsx";
import { MantineStyleProp, Paper, Text } from "@mantine/core";

export interface OfferingProps {
  offering: Omit<OfferingInfo, "component">;
}

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

function CourseComponent({ offering }: OfferingProps) {
  return getDayColoredPaper(offering);
}

export default CourseComponent;
