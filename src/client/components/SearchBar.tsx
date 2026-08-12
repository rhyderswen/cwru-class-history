import { Combobox, Loader, TextInput, useCombobox } from "@mantine/core";
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

  return (
    <form ref={formRef} onSubmit={form.onSubmit((values) => onSubmit?.(values.input))}>
      <Combobox
        onOptionSubmit={(optionValue) => {
          onChange?.(optionValue);
          setValue(optionValue);
          form.setFieldValue("input", optionValue);
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
            onChange={(event) => {
              onChange?.(event.currentTarget.value);
              setValue(event.currentTarget.value);
              form.setFieldValue("input", event.currentTarget.value);
              combobox.resetSelectedOption();
              combobox.openDropdown();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => {
              combobox.openDropdown();
            }}
            onBlur={() => combobox.closeDropdown()}
            rightSection={loading && <Loader size={18} />}
            styles={{
              root: {
                display: "flex",
                flexDirection: "column",
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
