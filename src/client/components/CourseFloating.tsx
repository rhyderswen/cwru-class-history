import { useSearchPage } from "@/contexts/searchPageContext";
import {
  CloseButton,
  Divider,
  FloatingWindow,
  Group,
  Paper,
  Stack,
  Text,
  Transition,
} from "@mantine/core";
import { SetFloatingWindowPosition, useViewportSize } from "@mantine/hooks";
import { useRef } from "react";

function CourseFloating() {
  const { selectedCourse, courseFloatingOpened, closeCourseFloating } = useSearchPage();
  const { width } = useViewportSize();
  const setPositionRef = useRef<SetFloatingWindowPosition | null>(null);

  return (
    <Transition
      mounted={!!selectedCourse && courseFloatingOpened}
      transition="pop"
      duration={200}
      timingFunction="ease"
    >
      {(styles) => (
        <FloatingWindow
          style={styles}
          setPositionRef={setPositionRef}
          dragHandleSelector=".drag"
          initialPosition={{ top: 100, left: width < 850 ? 10 : (width - 850) / 2 + 850 }} // (width - 850) / 2 is width of left gap, 850 is width of dropdowns
        >
          <Paper shadow="md" p="md">
            <Group justify="space-between" mb="xs" className="drag">
              <Stack gap={4}>
                <Text fw={500} className="monospace" lh={1}>
                  {selectedCourse?.catalogNumber}
                </Text>
                <Text size="sm" lh={1} c="gray">
                  {selectedCourse?.title}
                </Text>
              </Stack>
              <CloseButton onClick={closeCourseFloating} />
            </Group>
            <Divider />
            {selectedCourse?.component} section {selectedCourse?.sectionNumber} - Course #{" "}
            {selectedCourse?.courseNumber}
          </Paper>
        </FloatingWindow>
      )}
    </Transition>
  );
}

export default CourseFloating;
