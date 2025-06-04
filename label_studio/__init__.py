"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import importlib.metadata

# Package name
package_name = 'label-studio'

# Package version
try:
    __version__ = importlib.metadata.version(package_name)
except importlib.metadata.PackageNotFoundError:  # pragma: no cover - fallback for src installs
    # Package isn't installed, so importlib can't find the metadata.
    # This happens when running from a source checkout.
    __version__ = '0.0.0'

# pypi info
__latest_version__ = None
__current_version_is_outdated__ = False
__latest_version_upload_time__ = None
__latest_version_check_time__ = None
