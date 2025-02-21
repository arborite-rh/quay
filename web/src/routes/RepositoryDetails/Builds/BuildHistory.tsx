import {Title, ToggleGroup, ToggleGroupItem} from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  CodeBranchIcon,
  CodeIcon,
  ExclamationTriangleIcon,
  SyncAltIcon,
  TagIcon,
  TimesCircleIcon,
  UserIcon,
} from '@patternfly/react-icons';
import {Table, Tbody, Td, Th, Thead, Tr} from '@patternfly/react-table';
import {useState} from 'react';
import LinkOrPlainText from 'src/components/LinkOrPlainText';
import {LoadingPage} from 'src/components/LoadingPage';
import Conditional from 'src/components/empty/Conditional';
import RequestError from 'src/components/errors/RequestError';
import {useBuilds} from 'src/hooks/UseBuilds';
import {useQuayConfig} from 'src/hooks/UseQuayConfig';
import {
  formatDate,
  humanizeTimeForExpiry,
  isNullOrUndefined,
} from 'src/libs/utils';
import {
  RepositoryBuild,
  RepositoryBuildPhase,
} from 'src/resources/BuildResource';
import BuildTriggerDescription from './BuildTriggerDescription';

const ONE_DAY_IN_SECONDS = 24 * 3600;
const RESOURCE_URLS = {
  github: {
    commit: '/commit/{commit}',
    branch: '/tree/{branch}',
    tag: '/releases/tag/{tag}',
  },
  gitlab: {
    commit: '/commit/{commit}',
    branch: '/tree/{branch}',
    tag: '/commits/{tag}',
  },
  bitbucket: {
    commit: '/commits/{commit}',
    branch: '/branch/{branch}',
    tag: '/commits/tag/{tag}',
  },
};
enum Filters {
  RECENT_BUILDS = 'Recent builds',
  LAST_48_HOURS = 'Last 48 hours',
  LAST_30_DAYS = 'Last 30 days',
}

export default function BuildHistory(props: BuildHistoryProps) {
  const [buildsSinceInSeconds, setBuildsSinceInSeconds] = useState<number>();
  const [dateStartedFilter, setDateStartedFilter] = useState<Filters>(
    Filters.RECENT_BUILDS,
  );
  const {builds, isError, error, isLoading} = useBuilds(
    props.org,
    props.repo,
    buildsSinceInSeconds,
  );

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isError) {
    return <RequestError message={error as string} />;
  }

  const setFilter = (filterType: string) => {
    switch (filterType) {
      case Filters.RECENT_BUILDS:
        setDateStartedFilter(Filters.RECENT_BUILDS);
        setBuildsSinceInSeconds(null);
        break;
      case Filters.LAST_48_HOURS:
        setDateStartedFilter(Filters.LAST_48_HOURS);
        setBuildsSinceInSeconds(
          Math.round(new Date().getTime() / 1000) - 2 * ONE_DAY_IN_SECONDS,
        );
        break;
      case Filters.LAST_30_DAYS:
        setDateStartedFilter(Filters.LAST_30_DAYS);
        setBuildsSinceInSeconds(
          Math.round(new Date().getTime() / 1000) - 30 * ONE_DAY_IN_SECONDS,
        );
    }
  };

  return (
    <>
      <Title headingLevel="h2" style={{paddingLeft: '1em', paddingTop: '1em'}}>
        Build History
      </Title>
      <ToggleGroup
        aria-label="filter build list by date"
        style={{padding: '1em'}}
      >
        <ToggleGroupItem
          text={Filters.RECENT_BUILDS}
          aria-label="filter recent builds"
          buttonId="filter-recent-builds"
          isSelected={dateStartedFilter === Filters.RECENT_BUILDS}
          onChange={() => setFilter(Filters.RECENT_BUILDS)}
        />
        <ToggleGroupItem
          text={Filters.LAST_48_HOURS}
          aria-label="filter builds from last 48 hours"
          buttonId="filter-48-hours"
          isSelected={dateStartedFilter === Filters.LAST_48_HOURS}
          onChange={() => setFilter(Filters.LAST_48_HOURS)}
        />
        <ToggleGroupItem
          text={Filters.LAST_30_DAYS}
          aria-label="filter builds from last 30 days"
          buttonId="filter-30-days"
          isSelected={dateStartedFilter === Filters.LAST_30_DAYS}
          onChange={() => setFilter(Filters.LAST_30_DAYS)}
        />
      </ToggleGroup>
      <Conditional if={builds.length === 0}>
        <p style={{padding: '1em'}}>
          No matching builds found. Please start a new build or adjust filter to
          view build status.
        </p>
      </Conditional>
      <Conditional if={builds.length > 0}>
        <Table aria-label="Repository builds table" variant="compact">
          <Thead>
            <Tr>
              <Th>Build ID</Th>
              <Th>Status</Th>
              <Th>Triggered by</Th>
              <Th>Date started</Th>
              <Th>Tags</Th>
            </Tr>
          </Thead>
          <Tbody>
            {builds.map((build) => (
              <Tr key={build.id} data-testid={`row-${build.id}`}>
                <Td data-label="Build ID">{build.id.substring(0, 8)}</Td>
                <Td data-label="Status">
                  <BuildPhase phase={build.phase} />
                </Td>
                <Td data-label="Triggered by">
                  <TriggeredBuildDescription build={build} />
                </Td>
                <Td data-label="Date started">{formatDate(build.started)}</Td>
                <Td data-label="Tags">
                  {build.tags?.map((tag) => (
                    <span key={tag}>
                      <TagIcon /> {tag}{' '}
                    </span>
                  ))}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Conditional>
    </>
  );
}

function BuildPhase({phase}: {phase: RepositoryBuildPhase}) {
  switch (phase) {
    case RepositoryBuildPhase.ERROR:
      return (
        <span>
          <TimesCircleIcon style={{color: 'red'}} /> error
        </span>
      );
    case RepositoryBuildPhase.COMPLETE:
      return (
        <span>
          <CheckCircleIcon style={{color: 'green'}} /> complete
        </span>
      );
    case RepositoryBuildPhase.EXPIRED:
      return (
        <span>
          <ExclamationTriangleIcon style={{color: 'orange'}} /> expired
        </span>
      );
    case RepositoryBuildPhase.INTERNAL_ERROR:
      return (
        <span>
          <ExclamationTriangleIcon style={{color: 'red'}} /> internal error
        </span>
      );
    case RepositoryBuildPhase.CANCELLED:
      return (
        <span>
          <BanIcon /> cancelled
        </span>
      );
    default:
      return (
        <span>
          <SyncAltIcon /> {phase}
        </span>
      );
  }
}

function TriggeredBuildDescription({build}: {build: RepositoryBuild}) {
  const commitSha = getCommitSha(build);
  if (!isNullOrUndefined(build.trigger_metadata?.commit_info)) {
    return <FullCommitDescription build={build} />;
  } else if (isNullOrUndefined(build.trigger)) {
    if (build.manual_user) {
      return (
        <>
          <UserIcon /> {build.manual_user}
        </>
      );
    } else {
      return <>(Manually Triggered Build)</>;
    }
  } else if (!isNullOrUndefined(build.trigger?.build_source) && commitSha) {
    return <>Triggered by commit {commitSha.substring(0, 7)}</>;
  } else {
    return (
      <>
        {' '}
        Triggered by <BuildTriggerDescription trigger={build.trigger} />
      </>
    );
  }
}

function FullCommitDescription({build}: {build: RepositoryBuild}) {
  const [showLongDescription, setShowLongDescription] = useState(false);
  return (
    <>
      <div>
        <CommitMessageSummary build={build} />
        <Conditional
          if={
            build?.trigger_metadata?.commit_info?.message?.length >= 80 ||
            build?.trigger_metadata?.commit_info?.message?.split('\n').length >
              1
          }
        >
          <span
            data-testid="expand-long-description"
            style={{paddingLeft: '.5em'}}
            onClick={() => setShowLongDescription(!showLongDescription)}
          >
            ...
          </span>
        </Conditional>
      </div>
      <Conditional
        if={
          !isNullOrUndefined(build?.trigger_metadata?.commit_info?.date) ||
          !isNullOrUndefined(build?.trigger_metadata?.commit_info?.author)
        }
      >
        Authored{' '}
        <Conditional
          if={!isNullOrUndefined(build?.trigger_metadata?.commit_info?.date)}
        >
          {humanizeTimeForExpiry(
            (new Date().getTime() -
              new Date(build?.trigger_metadata?.commit_info?.date).getTime()) /
              1000,
          )}{' '}
          ago{' '}
        </Conditional>
        <Conditional
          if={
            !isNullOrUndefined(
              build?.trigger_metadata?.commit_info?.author?.username,
            )
          }
        >
          <LinkOrPlainText
            href={build?.trigger_metadata?.commit_info?.author?.url}
          >
            by{' '}
            <Conditional
              if={
                !isNullOrUndefined(
                  build?.trigger_metadata?.commit_info?.author?.avatar_url,
                )
              }
            >
              <img
                style={{height: '1em', width: '1em', paddingRight: '.2em'}}
                src={build?.trigger_metadata?.commit_info?.author?.avatar_url}
              />
            </Conditional>
            {build?.trigger_metadata?.commit_info?.author?.username}{' '}
          </LinkOrPlainText>
        </Conditional>
        <span style={{paddingRight: '.5em'}}>
          <a href={getCommitURL(build)}>
            <CodeIcon /> {getCommitSha(build)?.substring(0, 7)}
          </a>
        </span>
        <span style={{paddingRight: '.5em'}}>
          <GitRefLink build={build} />
        </span>
      </Conditional>
      <Conditional if={showLongDescription}>
        <div>
          {getLongDescription(build?.trigger_metadata?.commit_info?.message)}
        </div>
      </Conditional>
    </>
  );
}

function GitRefLink({build}: {build: RepositoryBuild}) {
  const ref = build?.trigger_metadata?.ref;
  if (isNullOrUndefined(ref)) {
    return <></>;
  }

  const {resource, refType} = getResourceNameFromGitRef(
    build?.trigger_metadata?.ref,
  );
  if (isNullOrUndefined(resource)) {
    return <></>;
  }

  if (refType === 'heads') {
    const branchURL = getBranchURL(build);
    return (
      <LinkOrPlainText href={branchURL}>
        <CodeBranchIcon /> {resource}
      </LinkOrPlainText>
    );
  } else if (refType === 'tags') {
    const tagURL = getTagURL(build);
    return (
      <LinkOrPlainText href={tagURL}>
        <TagIcon /> {resource}
      </LinkOrPlainText>
    );
  }
}

function getCommitSha(build: RepositoryBuild) {
  return build.trigger_metadata?.commit || build.trigger_metadata?.commit_sha;
}

function getCommitURL(build: RepositoryBuild) {
  if (
    build.trigger_metadata &&
    build.trigger_metadata?.commit_info &&
    build.trigger_metadata?.commit_info.url
  ) {
    return build.trigger_metadata?.commit_info.url;
  }

  const trigger = build.trigger;
  if (!isNullOrUndefined(trigger?.repository_url)) {
    return (
      trigger.repository_url +
      RESOURCE_URLS[trigger?.service].commit.replace(
        '{commit}',
        getCommitSha(build),
      )
    );
  }
}

function getBranchURL(build: RepositoryBuild) {
  const {resource} = getResourceNameFromGitRef(build?.trigger_metadata?.ref);
  if (isNullOrUndefined(resource)) {
    return null;
  }
  const trigger = build.trigger;
  if (!isNullOrUndefined(trigger?.repository_url)) {
    return (
      trigger.repository_url +
      RESOURCE_URLS[trigger?.service].branch.replace('{branch}', resource)
    );
  }
}

function getTagURL(build: RepositoryBuild) {
  const {resource} = getResourceNameFromGitRef(build?.trigger_metadata?.ref);
  if (isNullOrUndefined(resource)) {
    return null;
  }
  const trigger = build.trigger;
  if (!isNullOrUndefined(trigger?.repository_url)) {
    return (
      trigger.repository_url +
      RESOURCE_URLS[trigger?.service].tag.replace('{tag}', resource)
    );
  }
}

function CommitMessageSummary({build}: {build: RepositoryBuild}) {
  const message = build.trigger_metadata?.commit_info?.message;
  if (isNullOrUndefined(message) || message.length == 0) {
    return <></>;
  }
  const commitURL = getCommitURL(build);
  const lines = message.split('\n');
  if (lines.length === 0) {
    return <></>;
  }
  if (isNullOrUndefined(commitURL)) {
    return <span>{lines[0].substring(0, 79).trim()}</span>;
  } else {
    return (
      <span>
        <a href={commitURL}>{lines[0].substring(0, 79).trim()}</a>
      </span>
    );
  }
}

function getResourceNameFromGitRef(ref: string) {
  const parts = ref.split('/');
  if (parts.length < 3) {
    return null;
  }
  return {
    resource: parts.slice(2).join('/'),
    refType: parts[1],
  };
}

function getLongDescription(message: string) {
  if (!message) {
    return '';
  }
  const lines = message.split('\n');
  if (lines.length === 0) {
    return '';
  }
  if (lines[0].length >= 80) {
    lines[0] = lines[0].substring(80);
  } else {
    lines.splice(0, 1);
  }
  return lines.join('\n').trim();
}

interface BuildHistoryProps {
  org: string;
  repo: string;
}
