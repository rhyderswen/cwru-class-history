import { CourseData } from "#/xlsx";
import Class from "@/components/Class";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router";

function Search() {
  const [searchParams] = useSearchParams();
  const { department } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["department", department],
    queryFn: async () => {
      const res = await fetch(`/api/lookupDepartment/${department}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  function filterData(data: CourseData[] | undefined): CourseData[] {
    const searchInput = searchParams.get("q") ?? "";

    if (!data) return [];
    if (!searchInput) return data;

    return data.filter(
      (item) =>
        item.courseCode.toLowerCase().includes(searchInput.toLowerCase()) ||
        item.title.toLowerCase().includes(searchInput.toLowerCase()),
    );
  }

  console.log(data);

  return (
    <div className="App">
      {isLoading ?
        <Center py="xl" maw={800}>
          <Loader mr="md" />
          <Text>
            Fetching course data from SIS. If this hasn't been cached recently, this may take a
            bit...
          </Text>
        </Center>
      : <Stack align="stretch" maw={550} mx="auto" py="md" gap="sm">
          {filterData(data)?.map((item: CourseData) => (
            <Class
              key={item.courseCode}
              courseCode={item.courseCode}
              title={item.title}
              offerings={item.offerings}
            />
          ))}
        </Stack>
      }
    </div>
  );
}

export default Search;
