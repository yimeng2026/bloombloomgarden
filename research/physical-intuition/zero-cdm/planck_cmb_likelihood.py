"""Input and residual conventions for the fixed-spectrum Planck CMB analysis."""

from pathlib import Path

import numpy as np


def load_class_lensed_cl(path, lmax=2500, t_cmb=2.7255):
    """Load CLASS ``cl_lensed.dat`` as zero-based FIRAS muK^2 D_ell arrays."""
    path = Path(path)
    data = np.loadtxt(path, comments="#")
    if data.ndim != 2 or data.shape[1] < 8:
        raise ValueError(f"Expected CLASS lensed columns l TT EE TE BB ...: {path}")
    if not np.isfinite(data).all():
        raise ValueError(f"Non-finite CLASS spectrum: {path}")
    expected_ell = np.arange(2, lmax + 1)
    if data.shape[0] != len(expected_ell) or not np.array_equal(data[:, 0], expected_ell):
        raise ValueError(f"CLASS multipoles must be contiguous integers 2..{lmax}: {path}")
    factor = (float(t_cmb) * 1.0e6) ** 2
    result = {"ell": np.arange(lmax + 1)}
    for column, name in [(1, "tt"), (2, "ee"), (3, "te")]:
        values = np.zeros(lmax + 1, dtype=float)
        values[2:] = data[:, column] * factor
        result[name] = values
    # CLASS stores l(l+1) C_l^phiphi/(2pi); Cobaya's pp is the deflection
    # spectrum [l(l+1)]^2 C_l^phiphi/(2pi), with no temperature conversion.
    result["pp"] = np.zeros(lmax + 1, dtype=float)
    result["pp"][2:] = data[:, 5] * expected_ell * (expected_ell + 1)
    return result


def assemble_camspec_delta(data_vector, ell_ranges, used_sizes, cl_names, theory, foregrounds, cals):
    """Independently assemble CamSpec's data-minus-calibrated-theory vector."""
    data_vector = np.asarray(data_vector, dtype=float)
    if sum(int(size) for size in used_sizes) != data_vector.size:
        raise ValueError("CamSpec used block sizes do not match data length")
    if not (len(ell_ranges) == len(used_sizes) == len(cl_names) == len(cals)):
        raise ValueError("CamSpec block metadata lengths differ")
    delta = data_vector.copy()
    offset = 0
    for index, (ells, size, name, cal) in enumerate(zip(ell_ranges, used_sizes, cl_names, cals)):
        size = int(size)
        if size == 0:
            continue
        ells = np.asarray(ells, dtype=int)
        if ells.size != size:
            raise ValueError(f"CamSpec block {name} has inconsistent multipole count")
        if index < 4:
            prediction = theory["tt"][ells] + foregrounds[index][ells]
        elif name == "TE":
            prediction = theory["te"][ells]
        elif name == "EE":
            prediction = theory["ee"][ells]
        else:
            raise ValueError(f"Unknown CamSpec block {name}")
        delta[offset:offset + size] -= prediction / cal
        offset += size
    return delta
