import {AxiosResponse} from 'axios';
import axios from 'src/libs/axios';
import {isNullOrUndefined} from 'src/libs/utils';
import {Entity} from './UserResource';

export enum RepositoryBuildPhase {
  ERROR = 'error',
  INTERNAL_ERROR = 'internalerror',
  BUILD_SCHEDULED = 'build-scheduled',
  UNPACKING = 'unpacking',
  PULLING = 'pulling',
  BUILDING = 'building',
  PUSHING = 'pushing',
  WAITING = 'waiting',
  COMPLETE = 'complete',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export interface RepositoryBuild {
  id: string;
  phase: RepositoryBuildPhase;
  started: string;
  display_name: string;
  subdirectory: string;
  dockerfile_path: string;
  context: string;
  tags: string[];
  manual_user: string;
  is_writer: boolean;
  trigger?: RepositoryBuildTrigger;
  trigger_metadata?: RepositoryBuildTriggerMetadata;
  resource_key: string;
  repository: {
    namespace: string;
    name: string;
  };
  archive_url: string;
  // Additional parameters that aren't currently used
  // error: any;
  // status: any;
}

export interface RepositoryBuildTrigger {
  id: string;
  service: string;
  is_active: boolean;
  build_source?: string;
  repository_url?: string;
  config?: {
    build_source?: string;
    dockerfile_path?: string;
    context?: string;
    branchtag_regex?: string;
    default_tag_from_ref?: boolean;
    latest_for_default_branch?: boolean;
    tag_templates?: string[];
    credentials?: [
      {
        name: string;
        value: string;
      },
    ];
    deploy_key_id?: number;
    hook_id?: number;
    master_branch?: string;
  };
  can_invoke?: boolean;
  enabled?: boolean;
  disabled_reason?: string;
  pull_robot?: Entity;
}

export interface RepositoryBuildTriggerMetadata {
  commit?: string;
  commit_sha?: string;
  ref?: string;
  default_branch?: string;
  git_url?: string;
  commit_info?: {
    url?: string;
    message?: string;
    date?: string;
    author?: {
      username?: string;
      url?: string;
      avatar_url?: string;
    };
    committer?: {
      username?: string;
      url?: string;
      avatar_url?: string;
    };
  };
}

interface RepositoryBuildsResponse {
  builds: RepositoryBuild[];
}

export async function fetchBuilds(
  org: string,
  repo: string,
  buildsSinceInSeconds = null,
  limit = 10,
) {
  const params = {limit: limit};
  if (!isNullOrUndefined(buildsSinceInSeconds)) {
    params['since'] = buildsSinceInSeconds;
  }
  const response: AxiosResponse<RepositoryBuildsResponse> = await axios.get(
    `/api/v1/repository/${org}/${repo}/build/`,
    {params: params},
  );
  return response.data.builds;
}

interface RepositoryBuildTriggersResponse {
  triggers: RepositoryBuildTrigger[];
}

export async function fetchBuildTriggers(
  namespace: string,
  repo: string,
  signal: AbortSignal,
) {
  const response: AxiosResponse<RepositoryBuildTriggersResponse> =
    await axios.get(`/api/v1/repository/${namespace}/${repo}/trigger/`, {
      signal,
    });
  return response.data.triggers;
}

export async function fetchBuildTrigger(
  namespace: string,
  repo: string,
  triggerUuid: string,
  signal: AbortSignal,
) {
  const response: AxiosResponse<RepositoryBuildTrigger> = await axios.get(
    `/api/v1/repository/${namespace}/${repo}/trigger/${triggerUuid}`,
    {
      signal,
    },
  );
  return response.data;
}

export async function toggleBuildTrigger(
  org: string,
  repo: string,
  trigger_uuid: string,
  enable: boolean,
) {
  const response: AxiosResponse<RepositoryBuildTriggersResponse> =
    await axios.put(
      `/api/v1/repository/${org}/${repo}/trigger/${trigger_uuid}`,
      {enabled: enable},
    );
  return response.data.triggers;
}

export async function deleteBuildTrigger(
  org: string,
  repo: string,
  trigger_uuid: string,
) {
  const response: AxiosResponse<RepositoryBuildTriggersResponse> =
    await axios.delete(
      `/api/v1/repository/${org}/${repo}/trigger/${trigger_uuid}`,
    );
  return response.data.triggers;
}

export interface RepositoryBuildTriggerAnalysis {
  namespace: string;
  name: string;
  robots: Entity[];
  status: string;
  message: string;
  is_admin: boolean;
}

export async function analyzeBuildTrigger(
  org: string,
  repo: string,
  triggerUuid: string,
  buildSource: string,
  context: string,
  dockerfilePath: string,
) {
  const body = {
    config: {
      build_source: buildSource,
      context: context,
      dockerfile_path: dockerfilePath,
    },
  };
  const response: AxiosResponse<RepositoryBuildTriggerAnalysis> =
    await axios.post(
      `/api/v1/repository/${org}/${repo}/trigger/${triggerUuid}/analyze`,
      body,
    );
  return response.data;
}

export interface TriggerConfig {
  buildSource: string;
  dockerfilePath?: string;
  context?: string;
  branchTagRegex?: string;
  defaultTagFromRef?: boolean;
  latestForDefaultBranch?: boolean;
  tagTemplates?: string[];
}

export async function activateBuildTrigger(
  org: string,
  repo: string,
  triggerUuid: string,
  config: TriggerConfig,
  robot?: string,
) {
  const body = {
    config: {
      build_source: config.buildSource,
      dockerfile_path: config.dockerfilePath,
      context: config.context,
      branchtag_regex: config.branchTagRegex,
      default_tag_from_ref: config.defaultTagFromRef,
      latest_for_default_branch: config.latestForDefaultBranch,
      tag_templates: config.tagTemplates,
    },
  };
  if (!isNullOrUndefined(robot)) {
    body['pull_robot'] = robot;
  }
  const response: AxiosResponse<RepositoryBuildTrigger> = await axios.post(
    `/api/v1/repository/${org}/${repo}/trigger/${triggerUuid}/activate`,
    body,
  );
  return response.data;
}

export interface GitNamespace {
  peronal: boolean;
  id: string;
  title: string;
  avatar_url: string;
  url: string;
  score: number;
}

export interface FetchNamespaceResponse {
  namespaces: GitNamespace[];
}

export async function fetchNamespaces(
  namespace: string,
  repo: string,
  triggerUuid: string,
  signal: AbortSignal,
) {
  const response: AxiosResponse<FetchNamespaceResponse> = await axios.get(
    `/api/v1/repository/${namespace}/${repo}/trigger/${triggerUuid}/namespaces`,
    {
      signal,
    },
  );
  return response.data?.namespaces;
}

export interface GitResource {
  name: string;
  full_name: string;
  description: string;
  last_updated: number;
  url: string;
  has_admin_permissions: boolean;
  private: boolean;
}

interface FetchSourcesResponse {
  sources: GitResource[];
}

export async function fetchSources(
  namespace: string,
  repo: string,
  triggerUuid: string,
  gitNamespaceId: string,
) {
  console.log(gitNamespaceId);
  const response: AxiosResponse<FetchSourcesResponse> = await axios.post(
    `/api/v1/repository/${namespace}/${repo}/trigger/${triggerUuid}/sources`,
    {
      namespace: gitNamespaceId,
    },
  );
  return response.data?.sources;
}

export interface SourceRef {
  kind: string;
  name: string;
}

interface FetchRefsResponse {
  values: SourceRef[];
}

export async function fetchRefs(
  namespace: string,
  repo: string,
  triggerUuid: string,
  source: string,
) {
  const response: AxiosResponse<FetchRefsResponse> = await axios.post(
    `/api/v1/repository/${namespace}/${repo}/trigger/${triggerUuid}/fields/refs`,
    {
      build_source: source,
    },
  );
  return response.data?.values;
}

interface SourceSubDirs {
  dockerfile_paths: string[];
  contextMap: Map<string, string[]>;
  status: string;
}

export async function fetchSubDirs(
  namespace: string,
  repo: string,
  triggerUuid: string,
  source: string,
) {
  const response: AxiosResponse<SourceSubDirs> = await axios.post(
    `/api/v1/repository/${namespace}/${repo}/trigger/${triggerUuid}/subdir`,
    {
      build_source: source,
    },
  );
  // Convert contextMap from object to Map
  response.data.contextMap = new Map(Object.entries(response.data.contextMap));
  return response.data;
}
