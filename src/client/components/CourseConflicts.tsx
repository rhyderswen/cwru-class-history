import { CourseConflictResult } from "#/handlers/conflictsBetweenCourses";
import CourseConflictComponent from "@/components/CourseConflictComponent";
import { getCourseCodeColor } from "@/libs/color";
import { Box, Collapse, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { ComponentOrder, parseComponent } from "~/vars";
import CourseNonconflictComponent from "./CourseNonconflictComponent";

function CourseConflicts({ courseCode, title, conflicting, nonconflicting }: CourseConflictResult) {
  const [expanded, { toggle, open }] = useDisclosure(false);

  useEffect(() => {
    const hash = decodeURIComponent(globalThis.location.hash.slice(1));
    if (hash === courseCode) {
      open();
    }
  }, [globalThis.location.hash, open]);

  return (
    <Paper shadow="xs" id={courseCode}>
      <Box p="md">
        <Group justify="space-between" wrap="nowrap">
          <Text className="monospace" size="lg" c={getCourseCodeColor(courseCode)}>
            {courseCode}
          </Text>
          <Text truncate="end" size="lg">
            {title}
          </Text>
        </Group>
      </Box>
      <Divider />
      {Object.entries(conflicting).length === 0 ?
        <Text m="md">No conflicts found!</Text>
      : <Stack m="md">
          {Object.entries(conflicting)
            .sort(
              ([a], [b]) =>
                ComponentOrder.indexOf(parseComponent(a.toUpperCase())) -
                ComponentOrder.indexOf(parseComponent(b.toUpperCase())),
            )
            .map(([component, offerings]) => (
              <CourseConflictComponent
                component={parseComponent(component.toUpperCase())}
                offerings={offerings}
                key={component}
              />
            ))}
        </Stack>
      }
      {Object.entries(nonconflicting).length > 0 && (
        <>
          <Divider />
          <Group flex="0 0 auto" onClick={toggle} style={{ cursor: "pointer" }} m="md">
            <CaretDownIcon className={"rotatable " + (expanded ? "rotated" : "rotatable")} />
            <Text c="muted" fs="italic" size="sm">
              {expanded ? "Hide" : "Show"} non-conflicting offerings
            </Text>
          </Group>
        </>
      )}
      <Collapse expanded={expanded}>
        <Divider />
        <Stack m="md">
          {Object.entries(nonconflicting)
            .sort(
              ([a], [b]) =>
                ComponentOrder.indexOf(parseComponent(a.toUpperCase())) -
                ComponentOrder.indexOf(parseComponent(b.toUpperCase())),
            )
            .map(([component, offerings]) => (
              <CourseNonconflictComponent
                component={parseComponent(component.toUpperCase())}
                offerings={offerings}
                key={component}
              />
            ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}

export default CourseConflicts;
