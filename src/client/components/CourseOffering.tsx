import { CourseInfo, OfferingInfo } from "#/libs/xlsx";
import { useSearchPage } from "@/contexts/searchPageContext";
import { getColoredNumber, getDayColor } from "@/libs/color";
import { MantineStyleProp, Paper, Text, UnstyledButton } from "@mantine/core";

export interface OfferingProps {
  offering: OfferingInfo & Omit<CourseInfo, "offerings">;
  term: string;
}

function makeColoredPaper(
  offering: OfferingInfo,
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
      <Text size="sm" lh={1} c="gray">
        {offering.instructor && `${offering.instructor} | `}
        {getColoredNumber(offering.enrollmentCap - offering.enrollmentTotal)}/
        {offering.enrollmentCap} open
      </Text>
    </Paper>
  );
}

function getDayColoredPaper(offering: OfferingInfo) {
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

function CourseComponent({ offering, term }: OfferingProps) {
  const { setSelectedCourse } = useSearchPage();

  return (
    <UnstyledButton
      onClick={() =>
        setSelectedCourse({
          ...offering,
          term: term,
        })
      }
    >
      {getDayColoredPaper(offering)}
    </UnstyledButton>
  );
}

export default CourseComponent;
