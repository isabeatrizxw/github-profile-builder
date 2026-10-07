"use client";

import Image from "next/image";
import { MAX_TECHNOLOGIES } from "@/lib/readme/config";
import {
  TECHNOLOGIES,
  TECHNOLOGY_CATEGORIES,
  technologyIconUrl,
  type TechnologyCategory,
} from "@/lib/readme/technologies";
import { OPTION_CLASS } from "./form-styles";

export const TECHNOLOGIES_BY_CATEGORY = TECHNOLOGY_CATEGORIES.map((category) => ({
  category,
  technologies: TECHNOLOGIES.filter((tech) => tech.category === category),
}));

export function toggleItem(list: string[], value: string, checked: boolean): string[] {
  return checked ? [...list, value] : list.filter((item) => item !== value);
}

/**
 * Catalog checkboxes of one category. `name` makes them part of the form;
 * without it the parent sends the selection another way (custom sections).
 */
export function TechnologyCheckboxes(props: {
  category: TechnologyCategory;
  labelledBy: string;
  selected: string[];
  onChange: (next: string[]) => void;
  name?: string;
}) {
  const isFull = props.selected.length >= MAX_TECHNOLOGIES;
  const technologies = TECHNOLOGIES_BY_CATEGORY.find((group) => group.category === props.category)?.technologies ?? [];
  return (
    <div role="group" aria-labelledby={props.labelledBy} className="flex flex-wrap gap-2">
      {technologies.map((tech) => {
        const checked = props.selected.includes(tech.id);
        return (
          <label key={tech.id} className={`${OPTION_CLASS} items-center py-2 has-disabled:cursor-not-allowed has-disabled:opacity-50`}>
            <input type="checkbox" name={props.name} value={tech.id} checked={checked} disabled={!checked && isFull}
              onChange={(event) => props.onChange(toggleItem(props.selected, tech.id, event.target.checked))}
              className="accent-accent" />
            <Image src={technologyIconUrl(tech)} alt="" width={20} height={20} unoptimized className="size-5" />
            <span className="text-sm">{tech.name}</span>
          </label>
        );
      })}
    </div>
  );
}
