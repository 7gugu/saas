import * as mobx from 'mobx';
import { action, decorate, observable } from 'mobx';
import { useStaticRendering } from 'mobx-react'

import { addTeamApiMethod } from '../api/team-leader';
import { getTeamListApiMethod, getTeamMembersApiMethod } from '../api/team-member';

import { User } from './user';
import { Team } from './team';

useStaticRendering(typeof window === 'undefined');

mobx.configure({ enforceActions: 'observed' });

class Store {
  public isServer: boolean;

  public currentUser?: User = null;
  public currentUrl = '';

  public currentTeam?: Team;

  constructor({
    initialState = {},
    isServer,
  }: {
    initialState?: any;
    isServer: boolean;
  }) {
    this.isServer = !!isServer;

    this.setCurrentUser(initialState.user);

    this.currentUrl = initialState.currentUrl || '';

    if (initialState.teamSlug) {
      this.setCurrentTeam(initialState.teamSlug);
    }
  }

  public changeCurrentUrl(url: string) {
    this.currentUrl = url;
  }

  public async setCurrentUser(user) {
    if (user) {
      this.currentUser = new User({ store: this, ...user });

    } else {
      this.currentUser = null;
    }
  }

  public async addTeam({ name, avatarUrl }: { name: string; avatarUrl: string }): Promise<Team> {
    const data = await addTeamApiMethod({ name, avatarUrl });
    const team = new Team({ store: this, ...data });

    return team;
  }

  public async setCurrentTeam(slug: string) {
    if (this.currentTeam) {
      if (this.currentTeam.slug === slug) {
        return;
      }
    }

    let found = false;

    const { teams = [] } = await getTeamListApiMethod();

    for (const team of teams) {
      if (team.slug === slug) {
        found = true;
        this.currentTeam = team;
        if (this.currentTeam) {
          const { users = [] } = await getTeamMembersApiMethod(this.currentTeam._id);
          await this.currentTeam
            .setInitialMembers(users)
            .catch((err) => console.error('Error while loading Users', err));
        }
        break;
      }
    }

    if (!found) {
      this.currentTeam = null;
    }
  }
}

decorate(Store, {
  currentUser: observable,
  currentUrl: observable,
  currentTeam: observable,

  changeCurrentUrl: action,
  setCurrentUser: action,
  setCurrentTeam: action,
});

let store: Store = null;

function initializeStore(initialState = {}) {
  const isServer = typeof window === 'undefined';

  const _store = (store !== null && store !== undefined) ? store : new Store({ initialState, isServer });

  // For SSG and SSR always create a new store
  if (typeof window === 'undefined') {
    return _store
  }
  // Create the store once in the client
  if (!store) {
    store = _store
  }

  console.log(_store);

  return _store
}

function getStore() {
  return store;
}

export { Store, initializeStore, getStore };
