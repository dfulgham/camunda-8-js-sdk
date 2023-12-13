import { getConsoleToken } from "@jwulf/oauth";
const pkg = require('../../package.json')
const debug = require('debug')('modelerapi')
import * as _ from 'isomorphic-fetch'
import { CreateCollaboratorDto, CreateFileDto, CreateFolderDto, CreateMilestoneDto, FileDto, FileMetadataDto, FolderDto, FolderMetadataDto, InfoDto, MilestoneDto, MilestoneMetadataDto, ProjectDto, ProjectMetadataDto, PubSearchDtoFileMetadataDto, PubSearchDtoMilestoneMetadataDto, PubSearchDtoProjectCollaboratorDto, PubSearchDtoProjectMetadataDto, PubSearchResultDtoFileMetadataDto, PubSearchResultDtoMilestoneMetadataDto, PubSearchResultDtoProjectCollaboratorDto, PubSearchResultDtoProjectMetadataDto, UpdateFileDto, UpdateFolderDto } from "./DTO";

const API_VERSION = 'v1'
const modelerApiUrl = process.env.CAMUNDA_MODELER_BASE_URL ?? 'https://modeler.cloud.camunda.io/api'

export class ModelerApiClient {
    private userAgentString: string
    private baseUrl: string

    constructor(userAgent?: string) {
        const customAgent = userAgent ? ` ${userAgent}`: ``
        this.userAgentString = `modeler-client-nodejs/${pkg.version}${customAgent}`
        this.baseUrl = `${modelerApiUrl}/${API_VERSION}`
        debug(`baseUrl: ${this.baseUrl}`)
    }

    private async getHeaders() {
        const auth = `Bearer ${await getConsoleToken(this.userAgentString)}`
        const headers = {
            'content-type': 'application/json',
            'authorization': auth,
            'user-agent': this.userAgentString,
            'accept': '*/*'
        }    
        debug(auth)
        return headers   
    }

    private decodeResponseOrThrow(res) {
        if (res.status === 200) {
            return res.json()
        }
        // 204: No Content
        if (res.status === 204) {
            return null
        }
        const err = new Error(res.statusText);
        (err as any).code = res.status
        throw err
    }

    /**
     * Adds a new collaborator to a project or modifies the permission level of an existing collaborator.
     * Note: Only users that are part of the authorized organization (see GET /api/v1/info) and logged in to Web Modeler at least once can be added to a project.
     */
    async addCollaborator(req: CreateCollaboratorDto) {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/collaborators`, {
            headers,
            method: 'PUT',
            body: JSON.stringify(req)
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * Searches for collaborators.
     * filter specifies which fields should match. Only items that match the given fields will be returned.
     * sort specifies by which fields and direction (ASC/DESC) the result should be sorted.
     * page specifies the page number to return.
     * size specifies the number of items per page. The default value is 10.
     */
    async searchCollaborators(req: PubSearchDtoProjectCollaboratorDto): Promise<PubSearchResultDtoProjectCollaboratorDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/collaborators/search`, {
            headers,
            method: 'POST',
            body: JSON.stringify(req)
        }).then(this.decodeResponseOrThrow)
    }

    async deleteCollaborator({ email, projectId }:{projectId: string, email: string}): Promise<null> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/project/${projectId}collaborators/${email}`, {
            headers,
            method: 'DELETE'
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * This endpoint creates a file.
     * 
     * To create a file, specify projectId and/or folderId:
     * 
     * When only folderId is given, the file will be created in that folder. The folder can be in any project of the same organization.
     * 
     * When projectId is given and folderId is either null or omitted altogether, the file will be created in the root of the project.
     * 
     * When projectId and folderId are both given, they must be consistent - i.e. the folder is in the project.
     * 
     * For connector templates, the following constraints apply:
     * 
     * The value of content.$schema will be replaced with https://unpkg.com/@camunda/zeebe-element-templates-json-schema/resources/schema.json and validated against it.
     * 
     * The value of name takes precedence over content.name. In case of mismatch, the latter will be adjusted to match the former automatically.
     * 
     * The value of content.id will be replaced with the file id generated by Web Modeler.
     * 
     * The value of content.version is managed by Web Modeler and will be updated automatically.
     * 
     * Note: The simplePath transforms any occurrences of slashes ("/") in file and folder names into an escape sequence consisting of a backslash followed by a slash ("\/"). This form of escaping facilitates the processing of path-like structures within file and folder names.
     */
    async createFile(req: CreateFileDto): Promise <FileMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/files`, {
            headers,
            method: 'POST',
            body: JSON.stringify(req)
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * Retrieves a file.
     * 
     * Note: The simplePath transforms any occurrences of slashes ("/") in file and folder names into an escape sequence consisting of a backslash followed by a slash ("\/"). This form of escaping facilitates the processing of path-like structures within file and folder names.
     */
    async getFile(fileId: string): Promise<FileDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/files/${fileId}`, {
            headers
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * Deletes a file.
     * Note: Deleting a file will also delete other resources attached to the file (comments, call activity/business rule task links, milestones and shares) which might have side-effects. Deletion of resources is recursive and cannot be undone. 
     */
    async deleteFile(fileId: string): Promise<null> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/files/${fileId}`, {
            headers
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * Updates the content, name, or location of a file, or all at the same time.
     * 
     * To move a file, specify projectId and/or folderId:
     * When only folderId is given, the file will be moved to that folder. The folder can be in another project of the same organization.
     * When projectId is given and folderId is either null or omitted altogether, the file will be moved to the root of the project.
     * When projectId and folderId are both given, they must be consistent - i.e. the new parent folder is in the new project.
     * The field revision holds the current revision of the file. This is used for detecting and preventing concurrent modifications.
     * For connector templates, the following constraints apply:
     * The value of content.$schema is not updatable.
     * The value of content.name can only be changed via name.
     * The value of content.id is not updatable.
     * The value of content.version is managed by Web Modeler and will be updated automatically.
     * Note: The simplePath transforms any occurrences of slashes ("/") in file and folder names into an escape sequence consisting of a backslash followed by a slash ("\/"). This form of escaping facilitates the processing of path-like structures within file and folder names.
     */
    async updateFile(fileId: string, update: UpdateFileDto): Promise<FileMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/files/${fileId}`, {
            headers,
            body: JSON.stringify(update)
        }).then(this.decodeResponseOrThrow)
    }     

    /**
     * Searches for files.
     * filter specifies which fields should match. Only items that match the given fields will be returned.
     * 
     * Note: Date fields need to be specified in a format compatible with java.time.ZonedDateTime; for example 2023-09-20T11:31:20.206801604Z.
     * 
     * You can use suffixes to match date ranges:
     * 
     * Modifier	Description
     * ||/y	Within a year
     * ||/M	Within a month
     * ||/w	Within a week
     * ||/d	Within a day
     * ||/h	Within an hour
     * ||/m	Within a minute
     * ||/s	Within a second
     * 
     * sort specifies by which fields and direction (ASC/DESC) the result should be sorted.
     * 
     * page specifies the page number to return.
     * size specifies the number of items per page. The default value is 10.
     * 
     * Note: The simplePath transform any occurrences of slashes ("/") in file and folder names into an escape sequence consisting of a backslash followed by a slash ("\/"). This form of escaping facilitates the processing of path-like structures within file and folder names.
     */
    async searchFiles(req: PubSearchDtoFileMetadataDto): Promise<PubSearchResultDtoFileMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/files/search`, {
            headers,
            body: JSON.stringify(req)
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * 
     * Creates a new folder.
     * 
     * When only parentId is given, the folder will be created in that folder. The folder can be in any project of the same organization.
     * 
     * When projectId is given and parentId is either null or omitted altogether, the folder will be created in the root of the project.
     * 
     * When projectId and parentId are both given, they must be consistent - i.e. the parent folder is in the project.
     */
    async createFolder(req: CreateFolderDto): Promise<FolderMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/folders`, {
            headers,
            method: 'POST',
            body: JSON.stringify(req)
        }).then(this.decodeResponseOrThrow)
    }

    async getFolder(folderId: string): Promise<FolderDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/folders/${folderId}`, {
            headers
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * 
     * Deletes an empty folder. A folder is considered empty if there are no files in it. Deletion of resources is recursive and cannot be undone.
     */
    async deleteFolder(folderId: string): Promise<null> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/folders/${folderId}`, {
            headers,
            method: 'DELETE'
        }).then(this.decodeResponseOrThrow)

    }

    /**
     * Updates the name or location of a folder, or both at the same time.
     * 
     * To move a folder, specify projectId and/or parentId:
     * 
     * When only parentId is given, the file will be moved to that folder. The folder must keep in the same organization.
     * 
     * When projectId is given and parentId is either null or omitted altogether, the file will be moved to the root of the project.
     * 
     * When projectId and parentId are both given, they must be consistent - i.e. the new parent folder is in the new project.
     */
    async updateFolder(folderId: string, update: UpdateFolderDto): Promise<FolderMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/folders/${folderId}`, {
            headers,
            method: 'PATCH',
            body: JSON.stringify(update)
        }).then(this.decodeResponseOrThrow)
    }

    async getInfo(): Promise<InfoDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/info`, {
            headers
        }).then(this.decodeResponseOrThrow)
    }

    async createMilestone(req: CreateMilestoneDto): Promise<MilestoneMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/milestones`, {
            headers,
            method: 'POST',
            body: JSON.stringify(req)
        }).then(this.decodeResponseOrThrow)
    }

    async getMilestone(milestoneId: string): Promise<MilestoneDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/milestones/${milestoneId}`, {
            headers
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * Deletion of resources is recursive and cannot be undone.
     */
    async deleteMilestone(milestoneId: string) {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/milestones/${milestoneId}`, {
            headers
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * Returns a link to a visual comparison between two milestones where the milestone referenced by milestone1Id acts as a baseline to compare the milestone referenced by milestone2Id against.
     */
    async getMilestoneComparison(milestone1Id: string, milestone2Id: string): Promise<string> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/milestones/compare/${milestone1Id}...${milestone2Id}`, {
            headers
        }).then(res => res.text())
    }

    /**
     * Searches for milestones.
     * 
     * filter specifies which fields should match. Only items that match the given fields will be returned.
     * 
     * Note: Date fields need to be specified in a format compatible with java.time.ZonedDateTime; for example 2023-09-20T11:31:20.206801604Z.
     * 
     * You can use suffixes to match date ranges:
     * 
     * Modifier	Description
     * ||/y	Within a year
     * ||/M	Within a month
     * ||/w	Within a week
     * ||/d	Within a day
     * ||/h	Within an hour
     * ||/m	Within a minute
     * ||/s	Within a second
     * sort specifies by which fields and direction (ASC/DESC) the result should be sorted.
     * 
     * page specifies the page number to return.
     * 
     * size specifies the number of items per page. The default value is 10.
     */
    async searchMilestones(req: PubSearchDtoMilestoneMetadataDto): Promise<PubSearchResultDtoMilestoneMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/milestones/search`, {
            headers,
            method: 'POST',
            body: JSON.stringify(req)
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * Creates a new project. This project will be created without any collaborators, so it will not be visible in the UI by default. To assign collaborators, use `addCollaborator()`.
     */
    async createProject(name: string): Promise<ProjectMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/projects`, {
            headers,
            method: 'POST',
            body: JSON.stringify({name})
        }).then(this.decodeResponseOrThrow)
    }

    async getProject(projectId: string): Promise<ProjectDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/projects/${projectId}`, {
            headers
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * This endpoint deletes an empty project. A project is considered empty if there are no files in it. Deletion of resources is recursive and cannot be undone.
     */
    async deleteProject(projectId: string) {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/projects/${projectId}`, {
            headers,
            method: 'DELETE'
        }).then(this.decodeResponseOrThrow)        
    }

    async renameProject(projectId: string, name: string): Promise<ProjectMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/projects/${projectId}`, {
            headers,
            method: 'PATCH',
            body: JSON.stringify({name})
        }).then(this.decodeResponseOrThrow)
    }

    /**
     * Searches for projects.
     * 
     * filter specifies which fields should match. Only items that match the given fields will be returned.
     * 
     * Note: Date fields need to be specified in a format compatible with java.time.ZonedDateTime; for example 2023-09-20T11:31:20.206801604Z.
     * 
     * You can use suffixes to match date ranges:
     * 
     * Modifier	Description
     * ||/y	Within a year
     * ||/M	Within a month
     * ||/w	Within a week
     * ||/d	Within a day
     * ||/h	Within an hour
     * ||/m	Within a minute
     * ||/s	Within a second
     * 
     * sort specifies by which fields and direction (ASC/DESC) the result should be sorted.
     * 
     * page specifies the page number to return.
     * 
     * size specifies the number of items per page. The default value is 10.
     */
    async searchProjects(req: PubSearchDtoProjectMetadataDto): Promise<PubSearchResultDtoProjectMetadataDto> {
        const headers = await this.getHeaders()
        return fetch(`${this.baseUrl}/projects/search`, {
            headers,
            method: 'POST',
            body: JSON.stringify(req)
        }).then(this.decodeResponseOrThrow)   
    }
}