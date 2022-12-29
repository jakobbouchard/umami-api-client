import type { AxiosInstance } from "axios";

export interface UserAccountData {
	id: number;
	username: string;
	isAdmin: boolean;
	createdAt: string;
	updatedAt: string;
	accountUuid: string;
}

export class UserAccount implements UserAccountData {
	private readonly _axios: AxiosInstance;
	public readonly id: number;
	public username: string;
	public isAdmin: boolean;
	public readonly createdAt: string;
	public updatedAt: string;
	public accountUuid: string;

	constructor(axios: AxiosInstance, data: UserAccountData) {
		this._axios = axios;
		this.id = data.id;
		this.username = data.username;
		this.isAdmin = data.isAdmin;
		this.createdAt = data.createdAt;
		this.updatedAt = data.updatedAt;
		this.accountUuid = data.accountUuid;
	}

	/**
	 * Updates a user account
	 * @param options.username New username (admin only)
	 * @param options.password New password
	 * @returns The user account
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/[id]/index.js#L21-L53 Relevant Umami source code}
	 */
	public async update(options: { username: string; password: string }) {
		const { data } = await this._axios.post(`/accounts/${this.id}`, options);
		Object.assign(this, data);
		return this;
	}

	/**
	 * Updates a user account password
	 * @param options.current_password Current password
	 * @param options.new_password New password
	 * @returns The user account
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/[id]/password.js Relevant Umami source code}
	 */
	public async changePassword(options: { current_password: string; new_password: string }) {
		await this._axios.post(`/accounts/${this.accountUuid}/password`, options);
		return this;
	}

	/**
	 * Deletes the user account (admin only)
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/[id]/index.js#L55-L63 Relevant Umami source code}
	 */
	public async delete() {
		await this._axios.delete(`/accounts/${this.id}`);
	}
}
