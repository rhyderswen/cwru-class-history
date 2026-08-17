import { useSearchPage } from "@/contexts/searchPageContext";
import { getColoredNumber, shortenedDaysToColors } from "@/libs/utils";
import {
  CloseButton,
  DataList,
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

  const listData = [
    {
      label: "Instructor",
      value: selectedCourse?.instructor,
    },
    {
      label: "Room",
      value: selectedCourse?.room,
    },
    {
      label: "Type",
      value: selectedCourse?.component,
    },
    {
      label: "Enrollment",
      value: (
        <>
          {selectedCourse?.enrollmentCap !== undefined &&
            selectedCourse?.enrollmentTotal !== undefined && (
              <>
                {getColoredNumber(selectedCourse?.enrollmentCap - selectedCourse?.enrollmentTotal)}/
                {selectedCourse?.enrollmentCap} open
              </>
            )}
        </>
      ),
    },
    {
      label: "Section Num.",
      value: selectedCourse?.sectionNumber,
    },
    {
      label: "Course Num.",
      value: selectedCourse?.courseNumber,
    },
  ];

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
          initialPosition={{ top: 100, left: width < 850 ? 10 : (width - 850) / 2 + 825 }} // (width - 850) / 2 is width of left gap, 850 is width of dropdowns
          maw={300}
        >
          <Paper shadow="md" p="md">
            <Group justify="space-between" mb="xs" className="drag">
              <Stack gap={4} miw={0} flex="1">
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
            <Text my="xs" lh={1}>
              {selectedCourse?.term}
            </Text>
            <DataList gap="xs" my="xs">
              {listData.map((item) => (
                <>
                  {item.value && (
                    <DataList.Item key={item.label}>
                      <DataList.ItemLabel>{item.label}</DataList.ItemLabel>
                      <DataList.ItemValue>{item.value}</DataList.ItemValue>
                    </DataList.Item>
                  )}
                </>
              ))}
            </DataList>
            {selectedCourse?.days && (
              <>
                <Divider my="xs" />
                {shortenedDaysToColors(selectedCourse?.days || "")}
                <Text>{selectedCourse?.time}</Text>
              </>
            )}
          </Paper>
        </FloatingWindow>
      )}
    </Transition>
  );
}

export default CourseFloating;
