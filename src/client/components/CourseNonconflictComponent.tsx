import { OfferingWithConflicts } from "#/handlers/conflictsBetweenCourses";
import { Group, Paper, Text } from "@mantine/core";
import CourseTimeBadge from "./CourseTimeBadge";

export interface ComponentProps {
  component: string;
  offerings: OfferingWithConflicts[];
}

function CourseNonconflictComponent({ component, offerings }: ComponentProps) {
  return (
    <Paper shadow="none" p="md" bg="var(--mantine-color-gray-0)" withBorder>
      <Text ta="center" mb="xs" fw={700} size="lg">
        {component}
      </Text>
      <Group gap={4}>
        {offerings.map((offering) => (
          <CourseTimeBadge
            section={offering.sectionNumber}
            days={offering.days}
            time={offering.time}
            key={offering.courseNumber}
          />
        ))}
      </Group>
    </Paper>
  );
}

export default CourseNonconflictComponent;
