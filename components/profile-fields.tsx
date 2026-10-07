"use client";

import { useTranslations } from "next-intl";
import {
  FIELD_MAX_LENGTH,
  MAX_SOCIAL_ACCOUNTS,
  type DraftProfile,
  type FieldError,
  type FieldErrors,
} from "@/lib/drafts/content";
import { CharCount } from "./char-count";
import { ERROR_CLASS, INPUT_CLASS, useErrorMessage } from "./form-styles";

export type TextFieldName = "title" | "name" | "bio" | "location" | "company" | "blog" | "twitterUsername";
export type ProfileValues = Omit<DraftProfile, "socialAccounts">;

export function TextField(props: {
  name: TextFieldName;
  value: string;
  onChange: (value: string) => void;
  error?: FieldError;
  hint?: string;
  multiline?: boolean;
}) {
  const t = useTranslations("draftEditor.fields");
  const errorMessage = useErrorMessage();
  const { name, error, hint } = props;
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ");
  const common = {
    id: name,
    name,
    value: props.value,
    maxLength: FIELD_MAX_LENGTH[name],
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    className: INPUT_CLASS,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">{t(name)}</label>
      {props.multiline ? (
        <textarea rows={3} {...common} onChange={(event) => props.onChange(event.target.value)} />
      ) : (
        <input type="text" {...common} onChange={(event) => props.onChange(event.target.value)} />
      )}
      <div className="flex items-start justify-between gap-3">
        {hint ? <p id={`${name}-hint`} className="text-sm text-muted">{hint}</p> : <span />}
        <CharCount length={props.value.length} max={FIELD_MAX_LENGTH[name]} />
      </div>
      {error && <p id={`${name}-error`} className={ERROR_CLASS}>{errorMessage(error)}</p>}
    </div>
  );
}

export function ProfileFields(props: {
  profile: ProfileValues;
  social: string[];
  errors: FieldErrors;
  verifiedEmails: string[] | null;
  setField: (field: keyof ProfileValues, value: string | boolean) => void;
  setSocial: (index: number, value: string) => void;
}) {
  const t = useTranslations("draftEditor");
  const errorMessage = useErrorMessage();
  const { profile, errors, setField } = props;
  const emailOptions = [...new Set([...(props.verifiedEmails ?? []), profile.email].filter(Boolean))];

  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">{t("sections.profile")}</legend>
        <TextField name="name" value={profile.name} onChange={(v) => setField("name", v)} error={errors.name} />
        <TextField name="bio" value={profile.bio} onChange={(v) => setField("bio", v)} error={errors.bio} multiline hint={t("hints.bio", { max: FIELD_MAX_LENGTH.bio })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="location" value={profile.location} onChange={(v) => setField("location", v)} error={errors.location} />
          <TextField name="company" value={profile.company} onChange={(v) => setField("company", v)} error={errors.company} />
          <TextField name="blog" value={profile.blog} onChange={(v) => setField("blog", v)} error={errors.blog} />
          <TextField name="twitterUsername" value={profile.twitterUsername} onChange={(v) => setField("twitterUsername", v)} error={errors.twitterUsername} hint={t("hints.twitterUsername")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">{t("fields.email")}</label>
          <select
            id="email"
            name="email"
            value={profile.email}
            onChange={(event) => setField("email", event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={["email-hint", errors.email && "email-error"].filter(Boolean).join(" ")}
            className={INPUT_CLASS}
          >
            <option value="">{t("emailNone")}</option>
            {emailOptions.map((email) => <option key={email} value={email}>{email}</option>)}
          </select>
          <p id="email-hint" className="text-sm text-muted">
            {props.verifiedEmails ? t("hints.email") : t("emailsUnavailable")}
          </p>
          {errors.email && <p id="email-error" className={ERROR_CLASS}>{errorMessage(errors.email)}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" name="hireable" checked={profile.hireable} onChange={(event) => setField("hireable", event.target.checked)}
              aria-describedby="hireable-hint" className="size-5 accent-accent" />
            <span>{t("fields.hireable")}</span>
          </label>
          <p id="hireable-hint" className="pl-8 text-sm text-muted">{t("hints.hireable")}</p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3" aria-describedby="social-hint">
        <legend className="mb-2 text-lg font-semibold">{t("sections.social")}</legend>
        <p id="social-hint" className="text-sm text-muted">{t("hints.social", { max: MAX_SOCIAL_ACCOUNTS })}</p>
        {props.social.map((url, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <label htmlFor={`social-${index}`} className="text-sm font-medium">{t("fields.socialAccount", { number: index + 1 })}</label>
            <input
              id={`social-${index}`}
              name="socialAccounts"
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => props.setSocial(index, event.target.value)}
              maxLength={FIELD_MAX_LENGTH.socialAccount}
              aria-invalid={errors.socialAccounts && url.trim() ? true : undefined}
              aria-describedby={errors.socialAccounts ? "social-error" : undefined}
              className={INPUT_CLASS}
            />
          </div>
        ))}
        {errors.socialAccounts && <p id="social-error" className={ERROR_CLASS}>{errorMessage(errors.socialAccounts)}</p>}
      </fieldset>

      <p className="text-sm text-muted">{t("limitsNote")}</p>
    </div>
  );
}
