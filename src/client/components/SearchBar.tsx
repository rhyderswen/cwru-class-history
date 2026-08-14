import { CloseButton, Combobox, Loader, TextInput, useCombobox } from "@mantine/core";
import { useForm } from "@mantine/form";
import fuzzysort from "fuzzysort";
import { useImperativeHandle, useRef, useState } from "react";

export interface SearchBarHandle {
  clear: () => void;
}

export interface SearchBarProps {
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
  options?: string[];
  loading?: boolean;
  placeholder?: string;
  validation?: (value: string) => string | null;
  ref?: React.Ref<SearchBarHandle>;
}

function SearchBar({
  onSubmit,
  onChange,
  options,
  loading,
  placeholder,
  validation = () => null,
  ref,
}: SearchBarProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const form = useForm({
    validate: {
      input: validation,
    },
  });
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useImperativeHandle(ref, () => ({
    clear: () => {
      setValue("");
    },
  }));

  const comboboxOptions = fuzzysort.go(value, options || [], { limit: 0 }).map((item) => (
    <Combobox.Option value={item.target} key={item.target}>
      {item.target}
    </Combobox.Option>
  ));

  function processOnChange(value: string) {
    onChange?.(value);
    setValue(value);
    form.setFieldValue("input", value);
  }

  return (
    <form ref={formRef} onSubmit={form.onSubmit((values) => onSubmit?.(values.input))}>
      <Combobox
        onOptionSubmit={(optionValue) => {
          processOnChange(optionValue);
          combobox.closeDropdown();
          formRef.current?.requestSubmit();
        }}
        withinPortal={false}
        store={combobox}
      >
        <Combobox.Target>
          <TextInput
            {...form.getInputProps("input")}
            placeholder={placeholder || "Search..."}
            key={form.key("input")}
            value={value}
            ref={inputRef}
            onChange={(event) => {
              processOnChange(event.currentTarget.value);
              combobox.resetSelectedOption();
              combobox.openDropdown();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => {
              combobox.openDropdown();
            }}
            onBlur={() => combobox.closeDropdown()}
            rightSectionPointerEvents={!loading && value ? "all" : undefined}
            rightSection={
              loading ? <Loader size={18} />
              : value ?
                <CloseButton
                  aria-label="Clear input"
                  onClick={() => {
                    processOnChange("");
                    combobox.resetSelectedOption();
                    combobox.openDropdown();
                    inputRef.current?.focus();
                  }}
                />
              : undefined
            }
            styles={{
              root: {
                display: "flex",
                flexDirection: "column",
              },
              wrapper: {
                marginBottom: 0,
              },
              error: {
                order: -1,
                position: "absolute",
                transform: "translateY(-100%)",
              },
            }}
          />
        </Combobox.Target>

        <Combobox.Dropdown hidden={!loading && options === undefined}>
          <Combobox.Options mah={250} style={{ overflowY: "auto" }}>
            {comboboxOptions}
            {loading ?
              <Combobox.Empty>Fetching departments...</Combobox.Empty>
            : comboboxOptions?.length === 0 && <Combobox.Empty>No results found</Combobox.Empty>}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </form>
  );
}

export default SearchBar;
