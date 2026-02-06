# SS14 Cookbook

This is the source code for the [SS14 Cookbook](https://ss14.recipes). You are free to fork it, clone it, set up your own cookbook and make changes. This source code is released under the terms of the [**AGPLv3**](./LICENSE.txt).


## Preamble

I treat all my private software projects as experiments to one degree or another. Some of the code in this repo is downright messy, and not all of it adheres to best practices. (I also personally think many of the web's "best practices" are detrimental in various ways I won't get into here.) For example, all the CSS is contained in a single, giant CSS file. Moreover, the code is focused more on "make it work" and less on "make it pretty and easy for others to read".

Basically, take my code with a grain of salt. I write code differently in professional contexts. The SS14 codebase and data structure are both messy, and this tool by and large reflects that.

Secondarily, the tooling is incredibly immature. Most of it is focused on massaging mountains of game data into a vaguely usable form. There is absolutely nothing here that will help you with deployment. Recipes change infrequently enough that I simply haven't bothered investing any time into that.

Lastly, the recipe code is *incredibly* specialized. If you're forking the cookbook for a fork with radically different mechanics that the cookbook has no support for, you will need to make many modifications. The code makes many assumptions, which I often don't document particularly well.


## Setup

1. Clone the repo, optionally forking it first if you plan to make modifications. :)
2. Make sure you have a recent version of [Node](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed. Consider using [nvm](https://github.com/nvm-sh/nvm) or [nvm for Windows](https://github.com/coreybutler/nvm-windows) to make your life easier.
3. Copy `.env.example` to `.env` and customize as necessary. *Note: development uses `.env.development`, which is pre-configured for you.*
4. Clone the fork(s) you want to generate a cookbook for. Into a different folder somewhere else – don't put it in your cookbook repo.
5. The cookbook gets recipes straight from the game data. You will need local clones of whatever fork(s) you want to provide recipes for. Read through `sources.example.yml` and `sources.real.yml` to get a feel for how to configure your fork(s). Copy one of these files to `sources.yml`, or write your own from scratch. If anything is filled in incorrectly, you'll probably get a cryptic error. *Read carefully.*
6. In your terminal, run `npm run build` - this will build the recipe generator as well as the frontend.
7. Run `npm run gen:recipes` and wait patiently. Your computer will now be reading and parsing thousands of YAML files and hundreds of PNGs in order to build recipe data.

**Note:** The cookbook _does not_ manage your SS14 clones for you. It's up to you to decide where to clone repos to, how and when to update them. I _strongly_ recommend keeping separate copies of your repos just for the cookbook. It makes it much easier for you to ensure they are pristine – if you're actively developing for a fork, you probably don't want to publish work-in-progress recipes, sprites, etc.

You _do not_ need to fully initialize the repos for the cookbook; there's no need to run `RUN_THIS.py`, you don't have to install dotnet, or anything like that. The cookbook only really needs sprites and YAML files from `Resources/`.

### Developing

1. `npm run watch` - this builds the cookbook in dev mode.
2. In another terminal, `npm start`.
3. You should now be able to visit http://localhost:5514 (mnemonic: 5514 ≈ SS14). Have fun. :)

There is no hot module reloading. When you make changes, the reload button is your friend.

To test data migrations, run `npm run start-alt` to get a server running on https://localhost:5515. With the default `.env.development`, this secondary version will offer to redirect to :5514 with data migrations and everything. *Caution:* Migrating will completely overwrite any saved data on the target origin.

### Publishing

1. `npm run build` - this builds the cookbook in production mode.
2. If necessary: `npm run gen:recipes` - this rebuilds the recipe data. You only need to do this if you've changed your source repos or if you've modified the cookbook in some way.
2. You can now take the contents of `public/` and put them where you please.

**NOTE:** Please **do not** use the `npm start` script in production. The cookbook consists entirely of static files and the HTTP server is intended for *development only*. Configure your web server to serve static files!

**NOTE:** The build step does *not* clean up older builds, nor does `npm run gen:recipes` clean up old recipe or sprite data. There is currently no built-in tooling for that. It's up to you to figure out which files are most recent and publish what makes sense. The official cookbook website deliberately retains old versions – browsers may still reference them in long-lived tabs.

### Updating recipes

1. `git update` all the repos listed in your `sources.yml` file. There is no built-in tool for this.
2. `npm run gen:recipes`
3. Now you can publish the files in `public/data/`. This directory contains recipe data as well as sprites. There is no need to republish JS or CSS assets.

There is no built-in tool for automatically deploying updated recipes. As per the note above, old recipe data files are *retained*. Cleanup is your responsibility.


## Privacy policy

If you publish your own copy of the cookbook, **it's your responsibility to ensure the privacy policy is accurate to your server**. An inaccurate privacy policy can leave you liable in some jurisdictions.

The privacy policy is read from `privacy.html` in the repo root. This is an *HTML snippet*, not an entire HTML document. It is passed directly to `dangerouslySetInnerHTML`. Once the cookbook is built, there is no way to control the privacy policy from the outside; you don't need to worry about XSS.

If you change the privacy policy, you must rebuild the cookbook and republish it. See above under [Publishing](#publishing).


## Notices

If you want a notice to be displayed on the website, you must first create the file `public/data/notices.json`. This file contains an array of objects, with the following shape (sans comments):

```jsonc
{
  // A unique ID for this notice. Users can dismiss notices, and the ID helps
  // track which ones have been dismissed.
  "id": "unique-notice-id",
  // The notice kind Determines the colour and default icon.
  // Valid values are: "info", "warning" and "error".
  // Optional. Default: "info"
  "kind": "info",
  // The icon to display in the notice.
  // Valid values are: "info", "warning", "error" and "star".
  // I normally use "star" for new features.
  // Optional. Default: same as `kind`
  "icon": "star",
  // The title. Required.
  "title": "Cool new thing!",
  // A list of paragraphs that make up the body text of the notice. Required,
  // but can be empty (not very useful!).
  //
  // You can use extremely limited formatting here:
  //   [recipe=ID]some text[/recipe]
  //     Underlines "some text" and makes it display a recipe when hovered over.
  //     The recipe ID must *exactly* match what's in the data file, and note
  //     that many have prefixes - e.g. `heat!FoodEgg`.
  //   [link=https://example.com]link text[/link]
  //     Inserts a link to the given URL.
  "content": [
    "A new feature has been added. Check out [recipe=InterestingNewRecipe]new recipe[/recipe].",
    "Read more on [link=https://example.com]our website[/link]."
  ],
  // If present, shows the notice only if one of the specified forks is selected.
  // If the list is empty, the notice will not be shown.
  // Optional. Default: undefined
  "forks": ["base", "frontier"],
  // If present, only shows the notice to users who first visited before the
  // indicated date. Use this to avoid overwhelming new users with notices
  // about features and changes to a tool they've never used before.
  // If absent, the notice is shown to everyone.
  // Optional. Default: undefined
  "ifFirstVisitedBefore": "YYYYMMDD"
}
```

If there are any syntax errors in the notices file or if the file doesn't exist, the website prints an error to the console and falls back to an empty list. Don't put comments in the file, don't leave any trailing commas anywhere.


## Contributing

If you find a bug that prevents the cookbook from working as expected, you may contribute a fix or open an issue. This repo is not currently accepting feature-level contributions (including, but not limited to, new functionality, radically altered functionality, tooling changes and refactors).
