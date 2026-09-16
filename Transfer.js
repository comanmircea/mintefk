function test_cloneFolder() {
  try {
    const sourceFolderId = "1iTMKThGLRRIqmtqnxuMLlaGjg3MmLugan0WMGF5MgnZNtlPYNRbtfwgF";
    //master_folder: 135vg4kmcqw5IrZmp0YGKnyFd9cPHQ45k
    //libgw: 1iTMKThGLRRIqmtqnxuMLlaGjg3MmLugan0WMGF5MgnZNtlPYNRbtfwgF
    const destinationFolderId = "1YX20OeTis7k2lV9RXKQ8ZjmmIkEHPgly";
    // const shareConfig =
    // {
    //   email: "mircea.coman@gmail.com",
    //   role: "EDIT"
    // };

    //const retClone = cloneFolderWithContentsAndShare(sourceFolderId, destinationFolderId, false, shareConfig);
    
    //folderul
    const retCopy = LibGW.copyEntityToFolder(sourceFolderId.trim(), destinationFolderId.trim());
  }
  catch (err) {
    Log(LibLogType.Error, err.stack);
  }
  finally {
  }
}