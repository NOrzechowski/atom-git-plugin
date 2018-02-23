'use babel';

import { CompositeDisposable } from 'atom'
import { Directory } from 'atom'
import request from 'request'
import jquery from 'jquery'

export default {

  subscriptions: null,

  activate() {
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sourcefetch:fetch': () => this.fetch()
    }))
  },

  deactivate() {
    this.subscriptions.dispose()
  },
  fetch() {
    let editor
    if (editor = atom.workspace.getActiveTextEditor()) {
      let filePath = editor.getPath();

      let repoPromise = this.currentRepository(filePath);
      repoPromise.then((returnVal) => {
        let repo = returnVal;
        if(repo == null) {
          //Not in a git repository currently
          return;
        }
        //TODO: also check bitbucket apiUrl
        let gitUrl = repo.getOriginURL().substring(0, repo.getOriginURL().length-4);
        let githubString = 'github.com';
        let gthbIndex = gitUrl.indexOf(githubString);
        let gitApiUrl = gitUrl.slice(0,gthbIndex) + "api." + githubString + "/repos/" + gitUrl.slice(gthbIndex + githubString.length + 1, gitUrl.length);
        let gitApiUrlArray = gitApiUrl.split("/");
        let repoName = gitApiUrlArray[gitApiUrlArray.length-1];
        filePath  = filePath.replace(/\\/g, "/");
        gitApiUrl += "/commits?path=" + filePath.substring(filePath.indexOf(repoName) + repoName.length,filePath.length);
        this.download(gitApiUrl, this.processGitHubResponse);
      });
    }
  },
  processGitHubResponse(error, response, body) {
      if (!error && response.statusCode == 200) {
        //TODO: process response and show dialog here
        let commits = JSON.parse(body);
        if (commits.length > 0){
          let mostRecentCommitDate = commits[0]["commit"]["committer"]["date"];
          if (mostRecentCommitDate) {
            var now = new Date();
            var THIRTY_MIN=30*60*1000;
            if((now - new Date(mostRecentCommitDate)) < THIRTY_MIN) {
                atom.notifications.addWarning('This file was modified recently - you may want to pull')
            }
          }
        }
      }
  },
  download(apiUrl, callback) {
    var options = {
      url: apiUrl,
      headers: {
        'User-Agent': 'request'
      }
    };
    request(options, callback);
  },
  currentRepository(filePath) {
      let filePaths = filePath.split('\\');
      let directoryStructure = '';
      for(i = 0; i < filePaths.length - 1; i++ ) {
        directoryStructure += filePaths[i] + '\\';
      }
      directoryStructure = directoryStructure.trim(0, directoryStructure.length -1);
    return atom.project.repositoryForDirectory(new Directory(directoryStructure));
  }
};
