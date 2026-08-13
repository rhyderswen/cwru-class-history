import { CourseData } from "#/xlsx";
import ComponentListing from "@/components/ComponentListing";
import {
  Box,
  Collapse,
  Divider,
  FloatingIndicator,
  Group,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ComponentOrder } from "~/vars";
import "./Class.css";

function Class({ courseCode, title, offerings }: CourseData) {
  const [expanded, { toggle }] = useDisclosure(false);
  const [rootSelectorRef, setRootSelectorRef] = useState<HTMLDivElement | null>(null);
  const [controlsRefs, setControlsRefs] = useState<Record<string, HTMLButtonElement | null>>({});
  const [selectorIndex, setSelectorIndex] = useState(0);
  const [semester, setSemester] = useState("");

  const setControlRef = (index: number) => (node: HTMLButtonElement) => {
    controlsRefs[index] = node;
    setControlsRefs(controlsRefs);
  };

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

  const semesterButtons = offeredSemesters.sort().map((sem, index) => (
    <UnstyledButton
      key={sem}
      className={"semesterSelectorControl"}
      ref={setControlRef(index)}
      onClick={() => {
        setSelectorIndex(index);
        setSemester(sem);
      }}
      mod={{ active: selectorIndex === index }}
    >
      <span className={"semesterSelectorLabel"}>{sem}</span>
    </UnstyledButton>
  ));

  useEffect(() => {
    if (!semester) {
      setSemester(offeredSemesters[0]);
    }
  }, [offeredSemesters]);

  return (
    <Paper shadow="xs">
      <Box p="md" onClick={toggle} style={{ cursor: "pointer" }}>
        <Group justify="space-between" wrap="nowrap">
          <Group flex="0 0 auto">
            <CaretDownIcon className={"rotatable " + (expanded ? "rotated" : "rotatable")} />
            <Text id={courseCode} className="monospace" size="lg">
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
        <Box className={"semesterSelectorRoot"} ref={setRootSelectorRef} mx="auto" my="xs">
          {semesterButtons}
          <FloatingIndicator
            target={controlsRefs[selectorIndex]}
            parent={rootSelectorRef}
            className={"semesterSelectorIndicator"}
          />
        </Box>
        <Stack m="md">
          {Object.entries(offerings)
            .filter(([, semesters]) =>
              Object.keys(semesters).some((term) => term.split(" ")[0] === semester),
            )
            .sort(([a], [b]) => ComponentOrder.indexOf(a) - ComponentOrder.indexOf(b))
            .map(([component, semesters]) => (
              <ComponentListing
                component={component}
                offerings={semesters}
                key={component}
                selectedSemester={semester}
              />
            ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}

export default Class;
