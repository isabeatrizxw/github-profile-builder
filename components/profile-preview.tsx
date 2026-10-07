import type { ReactNode } from "react";
import Image from "next/image";
import type { DraftProfile } from "@/lib/drafts/content";
import { isSameXAccount } from "@/lib/url";
import { ExternalLink } from "./external-link";

type Detail = { key: string; node: ReactNode };

// Mirrors the order GitHub uses in the profile sidebar. Only draft data is
// shown; avatar and login come from the account and cannot be edited here.
export function ProfilePreview({
  login,
  avatarUrl,
  profile,
}: {
  login: string;
  avatarUrl: string;
  profile: DraftProfile;
}) {
  const candidates: (Detail | null)[] = [
    profile.company ? { key: "company", node: profile.company } : null,
    profile.location ? { key: "location", node: profile.location } : null,
    profile.email
      ? {
          key: "email",
          node: (
            <a href={`mailto:${profile.email}`} className="break-all underline underline-offset-4">
              {profile.email}
            </a>
          ),
        }
      : null,
    profile.blog ? { key: "blog", node: <ExternalLink value={profile.blog} newTab /> } : null,
    profile.twitterUsername
      ? { key: "twitter", node: <ExternalLink value={`https://x.com/${profile.twitterUsername}`} newTab /> }
      : null,
    // GitHub also lists the X username as a social account: show it once.
    ...profile.socialAccounts.filter((url) => !isSameXAccount(url, profile.twitterUsername)).map((url, index) => ({
      key: `social-${index}`,
      node: <ExternalLink value={url} newTab />,
    })),
  ];
  const details = candidates.filter((item): item is Detail => item !== null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 sm:flex-col sm:items-start">
        <Image
          src={avatarUrl}
          alt=""
          width={256}
          height={256}
          sizes="(min-width: 640px) 192px, 80px"
          className="size-20 rounded-full border border-border sm:size-48"
        />
        <div className="flex min-w-0 flex-col">
          {profile.name && (
            <p className="text-2xl font-semibold leading-tight break-words">{profile.name}</p>
          )}
          <p className="text-xl font-light text-muted break-words">{login}</p>
        </div>
      </div>
      {profile.bio && <p className="whitespace-pre-line break-words">{profile.bio}</p>}
      {details.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {details.map((item) => (
            <li key={item.key} className="break-words">{item.node}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
