export type ActivityTone = 'neutral' | 'success' | 'warning' | 'error';

export type ActivityItem = {
	id: string;
	title: string;
	description?: string;
	tone: ActivityTone;
	createdAtMs: number;
};

let items = $state<ActivityItem[]>([]);

function createActivityId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function addActivity({
	title,
	description,
	tone = 'neutral',
	id = createActivityId(),
}: {
	title: string;
	description?: string;
	tone?: ActivityTone;
	id?: string;
}) {
	items = [
		{
			id,
			title,
			description,
			tone,
			createdAtMs: Date.now(),
		},
		...items,
	].slice(0, 5);
}

export const activityFeed = {
	get items() {
		return items;
	},

	add: addActivity,

	info(title: string, description?: string) {
		addActivity({ title, description, tone: 'neutral' });
	},

	success(title: string, description?: string) {
		addActivity({ title, description, tone: 'success' });
	},

	warning(title: string, description?: string) {
		addActivity({ title, description, tone: 'warning' });
	},

	error(title: string, description?: string) {
		addActivity({ title, description, tone: 'error' });
	},

	clear() {
		items = [];
	},
};
