import { Box, FloatingIndicator, UnstyledButton } from "@mantine/core";
import { useEffect, useState } from "react";
import "./Selector.css";

export interface CourseBadgeProps {
  options: string[];
  setSelected: (option: string) => void;
  hideIndicator?: boolean;
  overrideValue?: string;
}

function Selector({ options, setSelected, hideIndicator, overrideValue }: CourseBadgeProps) {
  const [rootSelectorRef, setRootSelectorRef] = useState<HTMLDivElement | null>(null);
  const [controlsRefs, setControlsRefs] = useState<Record<string, HTMLButtonElement | null>>({});
  const [selectorIndex, setSelectorIndex] = useState(0);

  const setControlRef = (index: number) => (node: HTMLButtonElement) => {
    controlsRefs[index] = node;
    setControlsRefs(controlsRefs);
  };

  useEffect(() => {
    if (hideIndicator) {
      setSelectorIndex(-1);
    }
  }, [hideIndicator]);

  useEffect(() => {
    if (overrideValue) {
      const index = options.toSorted().indexOf(overrideValue);
      if (index !== -1) {
        setSelectorIndex(index);
        setSelected(overrideValue);
      }
    }
  }, [overrideValue]);

  return (
    <Box className={"selectorRoot"} ref={setRootSelectorRef} mx="auto" my="xs">
      {options.toSorted().map((option, index) => (
        <UnstyledButton
          key={option}
          className={"selectorControl"}
          ref={setControlRef(index)}
          onClick={() => {
            setSelectorIndex(index);
            setSelected(option);
          }}
          mod={{ active: selectorIndex === index }}
        >
          <span className={"selectorLabel"}>{option}</span>
        </UnstyledButton>
      ))}
      {!hideIndicator && (
        <FloatingIndicator
          target={controlsRefs[selectorIndex]}
          parent={rootSelectorRef}
          className={"selectorIndicator"}
        />
      )}
    </Box>
  );
}

export default Selector;
