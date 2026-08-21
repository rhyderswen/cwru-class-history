import { OfferingWithConflicts } from "#/handlers/conflictsBetweenCourses";
import { Badge, Box, Group, Paper, Text } from "@mantine/core";
import CourseTimeText from "./CourseTimeText";

export interface ComponentProps {
  component: string;
  offerings: OfferingWithConflicts[];
}

function CourseConflictComponent({ component, offerings }: ComponentProps) {
  return (
    <Paper shadow="none" p="md" bg="var(--mantine-color-gray-0)" withBorder>
      <Text ta="center" mb="xs" fw={700} size="lg">
        {component}
      </Text>
      <Box>
        {offerings.map((offering) => (
          <div key={offering.courseNumber}>
            <CourseTimeText
              section={offering.sectionNumber}
              days={offering.days}
              time={offering.time}
            />
            <Group mb={12} gap={4}>
              {offering.conflicts.map((conflict) => (
                // if conflict.length <= 14, then there's no section num and it's more serious
                <Badge key={conflict} color={conflict.length > 14 ? "gray" : "red"} tt="none">
                  {conflict}
                </Badge>
              ))}
            </Group>
          </div>
        ))}
      </Box>
    </Paper>
  );
}

export default CourseConflictComponent;
