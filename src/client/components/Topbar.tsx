import SearchBar, { SearchBarHandle } from "@/components/SearchBar";
import { Box, Group, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";

const MOCKDATA = [
  "CSDS - Computer Science",
  "ECSE - Electrical, Computer and Systems Engineering",
  "JAPN - Japanese",
  "MATH - Mathematics",
  "PHYS - Physics",
  "COGS - Cognitive Science",
];

export interface TopbarProps {
  children: React.ReactNode;
}

const Topbar = ({ children }: TopbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const searchBarRef = useRef<SearchBarHandle>(null);
  const filterBarRef = useRef<SearchBarHandle>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch(`/api/getDepartments`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  useEffect(() => {
    if (location.pathname === "/") {
      searchBarRef.current?.clear();
    }
    filterBarRef.current?.clear();
  }, [location.pathname]);

  return (
    <div className="root">
      <div className="App">
        <Link to="/">
          <Title order={1} mb="lg" ta="center">
            CWRU Course History
          </Title>
        </Link>
        <Group wrap="nowrap" gap="sm">
          <Box
            style={{
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 0,
              transition: "flex-grow 200ms ease",
            }}
          >
            <SearchBar
              options={data}
              loading={isLoading}
              onSubmit={(value) => navigate(`/search/${value.substring(0, 4).toUpperCase()}`)}
              placeholder="Search for a department..."
              validation={(value) => {
                if (!data?.some((d: string) => d.startsWith(value.substring(0, 4).toUpperCase()))) {
                  return "Not a valid department";
                }
                if (!/^[a-zA-Z]{4}$/.test(value.substring(0, 4))) {
                  return "Input must be a 4-letter department code";
                }
                return null;
              }}
              ref={searchBarRef}
            />
          </Box>

          <Box
            style={{
              flexGrow: location.pathname.startsWith("/search/") ? 1 : 0,
              flexBasis: 0,
              minWidth: 0,
              overflow: "hidden",
              transition: "flex-grow 200ms ease",
            }}
          >
            <SearchBar
              placeholder="Filter classes..."
              onChange={(value) =>
                value !== "" ? setSearchParams({ q: value }) : setSearchParams({})
              }
              ref={filterBarRef}
            />
          </Box>
        </Group>
      </div>
      {children}
    </div>
  );
};

export default Topbar;
