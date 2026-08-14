import { CourseDataEvent } from "#/main";
import { CourseData } from "#/xlsx";
import Course from "@/components/Course";
import { ActionIcon, Affix, Center, Progress, Stack, Text, Transition } from "@mantine/core";
import { useWindowScroll } from "@mantine/hooks";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router";

function Search() {
  const [searchParams] = useSearchParams();
  const { department } = useParams();
  const [scroll, scrollTo] = useWindowScroll();
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["department", department],
    queryFn: async () => {
      const res = await fetch(`/api/lookupDepartment/${department}`, { method: "HEAD" });
      if (!res.ok) {
        let err;
        if (res.status === 404) {
          err = new Error("Department not found") as Error & {
            status?: number;
          };
        } else {
          err = new Error(`Error ${res.status}: ${res.statusText}`) as Error & {
            status?: number;
          };
        }
        err.status = res.status;
        throw err;
      }

      return new Promise<CourseData[]>((resolve, reject) => {
        const seen = new Set<string>();
        const done = new Set<string>();
        setProgress({ done: 0, total: 0 });

        const source = new EventSource(`/api/lookupDepartment/${department}`);

        source.addEventListener("progress", (e) => {
          const event: CourseDataEvent = JSON.parse(e.data);
          if (event.status === "started") seen.add(event.term);
          if (event.status === "finished") done.add(event.term);
          setProgress({ done: done.size, total: seen.size });
        });

        source.addEventListener("done", (e) => {
          resolve(JSON.parse(e.data));
          source.close();
        });

        source.addEventListener("failed", (e) => {
          reject(new Error(JSON.parse(e.data).message ?? "Failed to fetch"));
          source.close();
        });

        source.addEventListener("error", () => {
          reject(new Error("Connection to server lost"));
          source.close();
        });
      });
    },
    retry: (failureCount, error) => {
      const status = (error as Error & { status?: number }).status;
      // Don't retry client errors (4xx)
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
  });

  function filterData(data: CourseData[] | undefined): CourseData[] {
    const searchInput = searchParams.get("q") ?? "";

    if (!data) return [];
    if (!searchInput) return data;

    return data.filter(
      (course) =>
        course.courseCode.toLowerCase().includes(searchInput.toLowerCase()) ||
        course.title.toLowerCase().includes(searchInput.toLowerCase()),
    );
  }

  console.log(data);

  return (
    <div className="App">
      {isError ?
        <Center py="xl" w="100%">
          <Text ta="center" mb="lg">
            {error instanceof Error ? error.message : "An unknown error occurred."}
          </Text>
        </Center>
      : isLoading ?
        <Center py="xl" w="100%">
          <Stack align="center" w="100%" gap="xs">
            <Text ta="center" mb="lg">
              Fetching course data from SIS. If this hasn't been cached recently, this may take a
              bit...
            </Text>
            <Progress
              value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
              w="60%"
              animated
            />
            {progress.total > 0 && (
              <Text size="sm" c="dimmed">
                {progress.done} / {progress.total} semesters fetched
              </Text>
            )}
          </Stack>
        </Center>
      : <Stack align="stretch" w="100%" mx="auto" py="md" gap="sm">
          {filterData(data)?.map((course: CourseData) => (
            <Course
              key={course.courseCode}
              courseCode={course.courseCode}
              title={course.title}
              offerings={course.offerings}
            />
          ))}
          {filterData(data).length === 0 && <Center>No courses found in the past 4 years.</Center>}
        </Stack>
      }
      <Affix position={{ bottom: 20, left: 20 }}>
        <Transition transition="slide-up" mounted={scroll.y > 0}>
          {(transitionStyles) => (
            <ActionIcon style={transitionStyles} onClick={() => scrollTo({ y: 0 })} size="xl">
              <ArrowUpIcon style={{ width: "70%", height: "70%" }} />
            </ActionIcon>
          )}
        </Transition>
      </Affix>
    </div>
  );
}

export default Search;
