#!/usr/bin/env python3
"""update_fw.py — copy the framework kit into this project's fw/ folder.

The kit is copied, never linked: file:// pages cannot import across folders,
and a project must keep working when the kit moves on. This replaces fw/core,
fw/test and the project's kit folder wholesale (fw/ is a copy by rule, so
nothing in it is ever hand-edited), writes fw/VERSION, and records the
version in project.json.

    python3 tools/update_fw.py                     # from project.json framework_src, else a new-boardgame
                                                   # skill in .claude/skills/, else ../_FRAMEWORK
    python3 tools/update_fw.py --framework PATH    # from elsewhere
    python3 tools/update_fw.py --dry-run

Then run `bash tools/run_tests.sh`.
"""
import argparse
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

KIT_DIRS = {"card": "card-table", "hex": "hex-board"}
# Only the reusable runners; the framework's own suites test the framework.
TEST_FILES = ["fw_harness.js", "fw_soak.js", "fw_live.py", "fw_ui_checks.py"]


def default_framework():
    """Where the kit comes from: project.json framework_src, then a game skill copied into this project
    (.claude/skills/new-*/framework), then the old shared layout (../_FRAMEWORK)."""
    try:
        src = json.load(open(os.path.join(HERE, "project.json"))).get("framework_src")
        if src and os.path.isfile(os.path.join(src, "VERSION")): return src
    except (OSError, ValueError): pass
    import glob
    for c in sorted(glob.glob(os.path.join(HERE, ".claude", "skills", "new-*", "framework"))):
        if os.path.isfile(os.path.join(c, "VERSION")): return c
    return os.path.join(HERE, "..", "_FRAMEWORK")


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--framework", default=default_framework())
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)

    fw_src = os.path.abspath(a.framework)
    pj_path = os.path.join(HERE, "project.json")
    with open(pj_path) as f:
        pj = json.load(f)
    kit = pj.get("kit")
    if kit not in KIT_DIRS:
        sys.exit("project.json: kit must be one of %s, got %r" % (sorted(KIT_DIRS), kit))
    if not os.path.isfile(os.path.join(fw_src, "VERSION")):
        sys.exit("not a framework folder (no VERSION): " + fw_src)
    version = open(os.path.join(fw_src, "VERSION")).read().strip()

    dest = os.path.join(HERE, "fw")
    plan = [("core", "core"), (KIT_DIRS[kit], KIT_DIRS[kit])]
    print("framework %s -> %s (kit: %s)" % (version, dest, kit))
    for src, dst in plan:
        print("  copy %s/" % src)
    for name in TEST_FILES:
        print("  copy test/%s" % name)
    if kit != "card":
        # Every page loads fw-tokens.css from card-table/, whichever kit it uses.
        print("  copy card-table/fw-tokens.css")
    if a.dry_run:
        return 0

    os.makedirs(dest, exist_ok=True)
    for src, dst in plan:
        target = os.path.join(dest, dst)
        if os.path.isdir(target):
            shutil.rmtree(target)
        shutil.copytree(os.path.join(fw_src, src), target)
    test_dir = os.path.join(dest, "test")
    if os.path.isdir(test_dir):
        shutil.rmtree(test_dir)
    os.makedirs(test_dir)
    for name in TEST_FILES:
        shutil.copy2(os.path.join(fw_src, "test", name), os.path.join(test_dir, name))
    if kit != "card":
        ct = os.path.join(dest, "card-table")
        if os.path.isdir(ct):
            shutil.rmtree(ct)
        os.makedirs(ct)
        shutil.copy2(os.path.join(fw_src, "card-table", "fw-tokens.css"), os.path.join(ct, "fw-tokens.css"))
    with open(os.path.join(dest, "VERSION"), "w") as f:
        f.write(version + "\n")
    pj["fw_version"] = version
    with open(pj_path, "w") as f:
        json.dump(pj, f, indent=2)
        f.write("\n")
    print("done. fw/VERSION = %s. Now run: bash tools/run_tests.sh" % version)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
