import { CourseInfo, OfferingInfo } from "#/libs/xlsx";
import { Box, Paper, Text } from "@mantine/core";
import { CourseComponent as CourseComponentEnum, DayOrder } from "~/vars";
import CourseOffering from "./CourseOffering";

export interface ComponentProps {
  component: string;
  offerings: Record<string, Omit<OfferingInfo, "component">[]>;
  courseInfo: Omit<CourseInfo, "offerings">;
  selectedSemester: string;
}

function CourseComponent({ component, offerings, courseInfo, selectedSemester }: ComponentProps) {
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
                    <CourseOffering
                      offering={{
                        ...offering,
                        ...courseInfo,
                        component: component as CourseComponentEnum,
                      }}
                      term={semester}
                    />
                  </span>
                ))}
            </Box>
          ))}
      </Box>
    </Paper>
  );
}

export default CourseComponent;
