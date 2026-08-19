import { CourseData } from "#/libs/xlsx";
import CourseComponent from "@/components/CourseComponent";
import Selector from "@/components/Selector";
import { useSearchPage } from "@/contexts/searchPageContext";
import { useURLParams } from "@/contexts/urlParamContext";
import { getCourseCodeColor } from "@/libs/color";
import { Box, Collapse, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ComponentOrder } from "~/vars";

function Course({ courseCode, title, offerings }: CourseData) {
  const [expanded, { toggle, open, close }] = useDisclosure(false);
  const [semester, setSemester] = useState("");
  const { searchParams } = useURLParams();
  const { collapseAllSignal } = useSearchPage();

  const offeredSemesters = getOfferedSemesters();

  function getOfferedSemesters() {
    const semesters = new Set<string>();

    for (const componentOfferings of Object.values(offerings)) {
      for (const term of Object.keys(componentOfferings)) {
        const [semester] = term.split(" ");
        semesters.add(semester);
      }
    }

    return Array.from(semesters);
  }

  useEffect(() => {
    const hash = decodeURIComponent(globalThis.location.hash.slice(1));
    if (hash === courseCode) {
      open();
    }
  }, [globalThis.location.hash, open]);

  useEffect(() => {
    close();
  }, [collapseAllSignal]);

  useEffect(() => {
    if (!semester) {
      setSemester(offeredSemesters[0]);
    }
  }, [offeredSemesters]);

  return (
    <Paper shadow="xs" id={courseCode}>
      <Box p="md" onClick={toggle} style={{ cursor: "pointer" }}>
        <Group justify="space-between" wrap="nowrap">
          <Group flex="0 0 auto">
            <CaretDownIcon className={"rotatable " + (expanded ? "rotated" : "rotatable")} />
            <Text className="monospace" size="lg" c={getCourseCodeColor(courseCode)}>
              {courseCode}
            </Text>
          </Group>
          <Text truncate="end" size="lg">
            {title}
          </Text>
        </Group>
      </Box>
      <Collapse expanded={expanded}>
        <Divider />
        <Selector
          options={offeredSemesters}
          setSelected={setSemester}
          overrideValue={searchParams.get("sem") ?? undefined}
        />
        <Stack m="md">
          {Object.entries(offerings)
            .filter(([, semesters]) =>
              Object.keys(semesters).some((term) => term.split(" ")[0] === semester),
            )
            .sort(([a], [b]) => ComponentOrder.indexOf(a) - ComponentOrder.indexOf(b))
            .map(([component, semesters]) => (
              <CourseComponent
                component={component}
                offerings={semesters}
                courseInfo={{ catalogNumber: courseCode, title }}
                key={component}
                selectedSemester={semester}
              />
            ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}

export default Course;
