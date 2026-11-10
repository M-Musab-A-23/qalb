"""Small 1D CNN on the beat waveform plus RR context, in PyTorch.

torch is optional: nothing here is imported unless a CNN is trained or loaded,
and ``torch_available()`` lets callers fall back to the boosting model.
"""
from __future__ import annotations

import importlib.util

import numpy as np

from .config import BEAT_LEN, CLASSES

SEED = 42


def torch_available() -> bool:
    return importlib.util.find_spec("torch") is not None


def build_network(n_rr: int, n_classes: int = len(CLASSES), width: int = 16):
    """Three conv blocks over the waveform, an RR branch, one hidden layer."""
    import torch
    from torch import nn

    class BeatNet(nn.Module):
        def __init__(self):
            super().__init__()

            def block(cin, cout):
                return nn.Sequential(nn.Conv1d(cin, cout, 7, padding=3), nn.BatchNorm1d(cout),
                                     nn.ReLU(), nn.MaxPool1d(2))

            self.conv = nn.Sequential(block(1, width), block(width, 2 * width),
                                      block(2 * width, 4 * width))
            self.rr = nn.Sequential(nn.Linear(n_rr, 32), nn.ReLU())
            self.head = nn.Sequential(nn.Linear(8 * width + 32, 64), nn.ReLU(), nn.Dropout(0.3),
                                      nn.Linear(64, n_classes))

        def forward(self, wave, rr):
            h = self.conv(wave)                                    # (B, C, T)
            h = torch.cat([h.mean(dim=2), h.amax(dim=2)], dim=1)   # (B, 2C)
            return self.head(torch.cat([h, self.rr(rr)], dim=1))

    return BeatNet()
